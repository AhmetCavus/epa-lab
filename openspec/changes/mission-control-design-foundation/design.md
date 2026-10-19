# Design — Mission Control Foundation

**Status:** IMPLEMENTED — the original baseline and 2026-10-18 frontend refinement are implemented; `verification.md` records rendered comparisons and actual browser zoom checks. Final owner visual review remains separate.

## Design principle

**One workspace, many protocols.** Mission data supplies actors, logical groups, directed interactions, explanations, evidence labels and checkpoints. Shared components only know how to display and select these structures. Existing mission catalog and workspace are retained and improved incrementally.

## Required workspace composition

```text
┌───────────────────────────────────────────────────────────────────────┐
│ Mission header: title · mode [Fixture/Live] · run status · Back       │
├────────────────┬─────────────────────────────────┬────────────────────┤
│ Mission panel  │ Protocol canvas                 │ Inspector          │
│ goal + steps   │ actors / groups / directed msgs │ step + provenance  │
│ active focus   │ selected path + channel legend  │ evidence / meaning │
├────────────────┴─────────────────────────────────┴────────────────────┤
│ Timeline: selectable events or clearly labeled explanatory samples   │
└───────────────────────────────────────────────────────────────────────┘
```

In narrower browser windows, stack or collapse side panels without hiding access to the inspector or the selected event. Do not build a native mobile client.

## Core interaction: select a message

1. Visitor loads fixture samples. The timeline lists samples explicitly labeled **Explained/Fixture**, not observed.
2. Visitor selects a sample by mouse or keyboard.
3. The canvas focuses the relevant source and destination actors, emphasizes one **directed** connection, and visually de-emphasizes unrelated paths.
4. The selected timeline item receives an active state; the inspector shows event title, actors, channel, evidence/provenance, learning explanation, and any limits on observability.
5. Visitor selects another sample, an actor, or an applicable learning checkpoint; the selection remains coherent and understandable.
6. Reset view resets visual selection/zoom but does not imply a logout, new OAuth run or deletion of recorded events.

**Special case: provider-internal checks.** If a sample refers to a provider's internal PKCE binding/verification, do **not** draw a fictitious network request between independent services. Highlight the Keycloak AS logical role and show an internal check annotation labeled **Not observable**. An eventual observed token-exchange outcome is separate evidence, not proof that internal steps were directly captured.

## OAuth sample fixture mapping (design only)

| Sample                             | Source        | Destination           | Channel           | Canvas behavior                                                      |
| ---------------------------------- | ------------- | --------------------- | ----------------- | -------------------------------------------------------------------- |
| Browser authorization redirect     | Browser / SPA | Keycloak AS           | Front channel     | Directed redirect edge                                               |
| Provider-internal PKCE binding     | Keycloak AS   | Internal AS operation | Provider internal | Highlight role + internal annotation, no fabricated external request |
| Direct code exchange               | NestJS BFF    | Keycloak AS           | Back channel      | Directed server-to-server edge                                       |
| Independent resource authorization | NestJS BFF    | Resource Server       | Back channel      | Directed request edge; API decision shown within Resource Server     |

These mappings illustrate the generic design; do not hardcode names or channels into the generic shell.

## Selection and data boundaries

- **Learning checkpoint**: navigation through concepts, independent of actual protocol execution.
- **Timeline sample**: a fixture describing a possible event, never a real network observation.
- **Observed event**: later comes from a trusted runtime projection with an explicit observer and timestamp.
- **Inspector**: shows `Explained`, `Observed`, or `Not observable`, and does not present these as interchangeable.
- Use a single selected interaction identity to keep canvas/timeline/inspector aligned; avoid duplicating competing selection states.

## Minimal presentation contract

Existing mission/step/actor types should be **extended only as needed** to express:

- Stable actor and logical group IDs.
- Directed interaction IDs and source/target actor IDs where an edge exists.
- Channel category (front, back, provider-internal, other if a mission truly requires it).
- Explanation and provenance status (`fixture/explained`, `observed`, `not-observable`).
- An optional target for a conceptual internal annotation, as distinct from a communication edge.

Do not create a universal protocol schema/DSL. Use simple typed fixture records and the current static mission registry. Preserve existing working component structure.

## Visual design baseline

Use existing `docs/design/assets/catalog-concept.png` and `workspace-concept.png` as visual targets. Preserve their dark navy surfaces, restrained cyan/blue highlights and technical visual language. Prioritize:

- Canvas as the main visual focal point and an active connection easy to find.
- Clear text hierarchy: normal explanatory content comfortably readable; reserve very small text for ancillary micro-labels only.
- Visible selected/focused/hover/disabled states with adequate contrast.
- Distinct but accessible channel encoding: line style + label/icon, **not color alone**.
- Reduce surrounding visual noise before adding animation or decoration.
- Motion is optional and respects reduced-motion settings; no simulated live protocol progress.

## Mission-agnostic validation

Render both the OAuth design fixture and conceptual ePA fixture through unchanged generic shell components. The ePA fixture remains explanatory only. The shell must not branch on `missionId`, `oauth`, `epa`, `PKCE`, `VAU`, or similar protocol terms.

## Accessibility and verification

- All timeline selections and actor inspection actions reachable with a keyboard and visibly focused.
- Text alternative or structured list for the diagram includes roles, origins, destinations and channel type.
- Works at normal and increased browser zoom without clipped essential content.
- Test empty, selected, provider-internal/not-observable, reset, and mission-switch states.
- Compare final UI screenshots with design assets; log intentional departures briefly.

## Non-goals and constraints

No real login calls, no new NestJS/Keycloak code, no graph-editing library unless existing rendering demonstrably cannot support required directed connections, no premature protocol adapter/plugin abstraction.

The refinement does not establish a need for a new library. Prefer improving the existing React/HTML/SVG components without dependencies. If that implementation fundamentally prevents reliable rendering, first document the concrete failure and explain the bounded component replacement before making it; keep mission data, selection and navigation contracts intact.

## Interaction decisions for implementation

The owner's request to implement this feature authorizes proceeding with the recommended, incremental choices:

1. Retain vertical swimlanes and add directed connections, preserving the current component structure and logical deployment groups.
2. Show all loaded communication paths lightly, with the selected path clearly emphasized. Internal checks are actor-local annotations and never directed network edges.

Use a discriminated fixture interaction type: a communication has source and destination IDs; an internal annotation has only an actor target. Mission data supplies channel labels and generic channel categories for styling. A single inspection selection identifies either a learning context, an actor or an interaction; the separately retained learning checkpoint is navigation context, never a run result.

The current fixtures load synchronously. The empty and loaded states are actual UI states; do not add artificial loading, execution progress or synthetic protocol errors. Unknown routes retain the existing recovery page. Future asynchronous loading/error and live/observed states remain outside this implementation and must be defined when their capabilities are introduced.

## Visual refinement decisions — 2026-10-18

These decisions refine the baseline above; they do not undo its behavior. The reference PNGs have been visually inspected alongside existing catalog and selected-message screenshots. Their composition, dark technical identity and visual emphasis are authoritative design direction; speculative controls and protocol-inaccurate arrows remain illustrative only.

### Catalog and workspace hierarchy

| Reference quality                                               | Refinement in existing UI                                                                                                                                             | Review evidence                                                             |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Distinctive dark navy/blue identity, luminous technical imagery | Compact hero with depth and a clear headline; differentiated mission artwork from existing assets or code-native visuals; restrained cyan accents                     | Side-by-side catalog/reference comparison at desktop and narrow widths      |
| Mission cards readable at a glance                              | Shared content anatomy: artwork, availability, title, outcome, topics, action; balanced card heights and aligned actions; avoid repeating bordered boxes inside cards | Both current previews retain honest status and keyboard-operable navigation |
| Diagram dominates the learning workspace                        | Compact header/notices; quieter Mission Panel and Inspector; largest desktop panel and strongest selection emphasis belong to the canvas                              | Empty, loaded and selected workspace captures                               |
| Clear participant row and spaced directional sequence           | Aligned participant headings, lifelines and measured message rows; subdued inactive paths; one obvious selected path                                                  | Long-label and selected-message screenshots plus geometry checks            |

Retain the two real catalog entries and existing routes/actions. Do not add speculative missions, search, filters, metrics or dead navigation to reproduce incidental mockup content. Maintain mission-owned copy and availability. Decoration must support scanability and never resemble functional traffic or live state.

Keep the desktop Mission Panel / Canvas / Inspector composition and the bottom timeline. At 1366 CSS pixels, the canvas is wider than either side panel. At intermediate widths, move the Inspector below the canvas before shrinking its contents; at narrow widths, stack panels in a logical reading order and keep all essential content reachable. Prefer spacing and surface contrast to nested borders. Share a small spacing scale based on 4/8px increments, text styles, radii and state colors across catalog, panels and controls; avoid component-by-component styling exceptions.

### Typography and readable scaling

Use a consistent sans-serif hierarchy for titles and prose, reserving monospace for technical identifiers and compact metadata. At default browser settings, body explanations and controls are at least 14 CSS px, participant/message labels at least 13px, and secondary metadata at least 12px. These are minimums, not reasons to make every label the same size. Normal explanatory text uses a line height of at least 1.4. Labels wrap within their allocated space; essential labels, evidence and controls are never ellipsized away or accessible only by hover.

The current map Fit can reduce the whole diagram to 25%, including its text. Change Fit/zoom behavior so the effective displayed essential text never falls below these minimums. Fit stops at the readable limit and retains horizontal scrolling when all participants cannot fit. Browser page zoom and map zoom are distinct controls; resetting map zoom must not cancel or compensate for browser zoom. The structured text alternative complements the diagram, rather than excusing unreadable visual text.

### Reliable sequence geometry

Retain the current component boundary: `ActorCanvas` owns the participant area, `interaction-layout` supplies shared geometry, and `InteractionPaths` renders rows/paths and selection targets. Actor centers, lifelines and arrow endpoints must use the same coordinate system within one scrollable diagram surface. A lifeline begins beneath each participant and continues through the message region. The AS and IdP retain separate participant positions/lifelines under the single Keycloak deployment heading supplied by mission data.

The present fixed 88px row / 62px path offset does not accommodate arbitrary wrapped labels. Replace that layout assumption with content-aware row sizing: determine the full label/channel/evidence block height, reserve a separate arrow or internal-annotation band, and apply consistent vertical gaps. Derive the diagram height and each path's Y position from the same row layout. Recalculate when container dimensions or text/font layout change. Do not move long labels over adjacent rows or the participant header. Keep text clear of message shafts and arrowheads; crossings with lifelines are part of sequence notation, not another message label.

Implementation uses intrinsic browser layout for those measurements: each normal-flow message button contains its wrapped label block followed by a separate SVG path band. Browser layout automatically updates heights when fonts/content change, while percentage-positioned lifelines span the full resulting region. This retains the current component boundary without a second measurement/state system. Map Fit uses 100% as its readable floor, and a resize observer recenters the selected path within the scrollable viewport.

Preserve the mission-supplied interaction order in the diagram, timeline and Replay explanation. Current fixture ordering is **explanation order**, not recorded chronology; do not invent timestamps or intermediate events. No sorting by channel, actor or selection. Leave future observed-event ordering to the future approved runtime contract.

A communication arrow starts at its source lifeline and terminates at its destination lifeline, including right-to-left cases. Geometry checks allow at most 2 CSS px of center/endpoint misalignment at map 100%, accounting for borders. No label may overlap another label, actor header or message arrow. Use representative long/wrapped test labels and uneven group sizes to expose failures; test-only layout fixtures do not become shipped mission samples. Provider-internal operations occupy a row with an actor-local annotation and no directed network edge. Generic rendering depends on IDs, groups, interaction kind and mission-provided channel labels, never OAuth actor names or message names.

### Interaction feedback and accessibility

Preserve the single active inspection selection and independently retained learning checkpoint. A timeline or diagram selection immediately highlights the same interaction and involved actors and updates the Inspector's channel, explanation and evidence. Non-selected paths remain legible but subdued. Use a combination of stroke weight/style, text/badge and surface emphasis; distinguish keyboard focus from selection and hover. Front channel, back channel and internal operations retain text plus distinct line/annotation treatment. Fixture versus observed evidence is a separate dimension from channel.

Keep native keyboard controls, logical focus order, pressed/current state semantics, structured text alternative, meaningful accessible names and visible focus rings. Pointer targets are at least 24×24 CSS px, with 44px preferred where space permits. Ordinary text contrast is at least 4.5:1 and essential non-text controls/focus indicators at least 3:1 against adjacent surfaces. Honor reduced motion; decorative SVG/artwork stays outside the accessibility tree. Selecting an offscreen row must allow reaching the corresponding path and Inspector without losing focus or hiding essential content. No new animation, network activity or evidence classification is implied by feedback.

## Refinement verification approach

Capture the current baseline before editing where feasible; retained test screenshots can supplement it, with their revision/date noted. Do not overwrite historical before captures or either reference PNG. Use the existing build, browser-test and axe tooling, adding focused assertions for row collisions, actor/lifeline/endpoint alignment, left/right direction, preserved order and synchronized mouse/keyboard selection. Inspect actual screenshots as well as asserting geometry; passing functional checks alone do not establish visual fidelity.

| Verification condition                                                  | Required screens/states                                                                      | Expected result                                                                                                                                                      |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop 1366×768 CSS viewport, actual browser zoom 100%                 | Catalog; OAuth empty, loaded, selected front/back/internal; conceptual ePA                   | Reference-derived hierarchy, clear labels, correct arrows, obvious selection and honest evidence                                                                     |
| Intermediate 1024×768; narrow 390×844 and 320×768 CSS viewports at 100% | Catalog and both workspaces; loaded/selected OAuth                                           | Panels reflow; essential content is reachable; no page-wide horizontal overflow; diagram-local horizontal scrolling is usable                                        |
| Same supported desktop browser window at actual page zoom 100% and 200% | Catalog and both workspaces, including loaded/selected communication and internal annotation | No overlapping or clipped essential content; readable text, reachable controls/Inspector and usable keyboard focus; diagram-local horizontal scrolling is acceptable |

Record browser/version, window/viewport dimensions, actual zoom setting, fixture/selection, screenshot paths and a pass/fail/Not verified result. Viewport reduction, device scale factor, CSS transforms and map zoom are supplementary tests and **not evidence of actual browser page zoom**. If actual zoom cannot be exercised, explicitly preserve W1 as an outstanding manual verification item with the 100%/200% walkthrough; do not claim that part passed.

The visual review compares both rendered screens to both PNGs for composition, type hierarchy/readability, spacing/alignment, navy surfaces and cyan accents, restrained borders, artwork balance and selected-state emphasis. Record a concrete result and justified deviations for each area, including failures requiring another pass. Do not use a single overall resemblance claim or a pixel-perfect comparison of incidental mockup content. Provide before/after screenshots where feasible; explicitly identify missing baseline captures.

During implementation, append a dated refinement section to `verification.md` with this matrix, component changes, image paths/comparisons, build/test/OpenSpec results, remaining visual issues and limitations. Preserve the original verification report and its warning unchanged as history; its earlier pass does not verify these new criteria. Automated axe scans alone do not establish full accessibility conformance. This remains one focused frontend refinement with no Slice 002 or OAuth/backend work.
