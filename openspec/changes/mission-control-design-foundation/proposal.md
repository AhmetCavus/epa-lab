# Mission Control Design Foundation

**Status:** IMPLEMENTED — the owner's 2026-10-18 frontend visual refinement is implemented with rendered evidence in `verification.md`; final owner visual review remains separate.  
**Change ID:** `mission-control-design-foundation`  
**Type:** UX / visual design / frontend interaction refinement

## Why

The existing Mission Catalog and Workspace are functionally correct and have recorded functional/accessibility verification. Their visual and interaction quality still falls significantly short of the original reference images:

- The catalog's repeated card treatment and sparse artwork lack the reference's distinctive hierarchy and visual identity.
- The workspace distributes emphasis across bordered panels instead of making the protocol visualization the centerpiece.
- Sequence labels use fixed-height rows and tightly stacked text; wrapping, spacing and scaled text need explicit readability and collision checks.
- Selection synchronization already works, but the selected actors, communication path, channel and explanation need stronger visual emphasis.

Refine the existing components and preserve their working navigation, mission definitions, evidence semantics and interaction model. The earlier implementation and verification remain historical evidence, not acceptance of these strengthened visual requirements.

## What changes

1. Make the existing Mission Catalog and Workspace visually coherent with the approved reference imagery and design tokens.
2. Make the protocol canvas the primary learning surface: draw mission-defined directed message edges between actors, visibly distinguish communication channels, and synchronize selection with timeline and inspector.
3. Define clear empty, fixture, selection, unobservable, error and loading states; visibly separate learning context from actually observed execution.
4. Improve hierarchy and readability at supported browser widths and zoom levels.
5. Confirm that the same UI interaction model works with the OAuth fixture and a conceptual ePA fixture without mission-ID checks or protocol nouns in the generic shell.

### Visual refinement revision — 2026-10-18

- Improve catalog composition, mission artwork, typography, card hierarchy, spacing and availability/action feedback using both original PNGs as the primary visual direction.
- Refine workspace panel proportions, surface hierarchy and selected-state emphasis; reduce repetitive borders and keep the canvas dominant.
- Make aligned participants, lifelines, correct directional endpoints and collision-free message rows a testable sequence-diagram contract. Preserve supplied order and use internal horizontal scrolling instead of shrinking text into illegibility.
- Preserve synchronization of actors, paths, timeline and Inspector, including explanations and channel/evidence classifications. Internal operations remain actor-local explanations, never observed HTTP traffic.
- Verify rendered screens against the references at desktop and narrow widths and actual browser zoom of 100% and 200%. Capture before/after evidence where feasible and explicitly retain any untested actual-zoom check as an outstanding manual item.

## Capabilities

- `mission-control-interactions`: extend the capability already declared by this unarchived change in `specs/mission-control-interactions/spec.md`. Preserve all seven original requirements and add explicit visual, sequence-layout, responsive, feedback, accessibility and visual-evidence acceptance scenarios. No additional capability or OpenSpec change is introduced.

## Impact

Work stays in `apps/playground`: existing Catalog, Workspace, ActorCanvas, InteractionPaths/layout, Timeline, Inspector and shared styles, plus focused browser checks and verification evidence. React, TypeScript, Vite, static mission registration and current accessibility behavior remain. Prefer existing components; explain a demonstrated rendering limitation before any focused diagram-component replacement. No unnecessary dependencies or unrelated refactoring.

## Explicitly out of scope

- NestJS BFF, Keycloak configuration, authentication, real OAuth flows, PAR, Resource Server behavior.
- A custom protocol engine, plugin framework, graph editor, custom canvas rendering framework or mission authoring tool.
- Replacing the existing frontend stack or reimplementing working navigation/components.
- Recording raw HTTP traffic or exposing sensitive credentials/tokens.
- Shipping the ePA mission as a real integration.

## Existing design sources

- `docs/design/assets/catalog-concept.png`
- `docs/design/assets/workspace-concept.png`
- `docs/design/visual-references.md`
- `docs/design/mission-catalog.md`
- `docs/design/mission-workspace.md`
- `docs/design/visual-system.md`
- Slice 001 screenshots and verification results in the working repository

Images are visual references, **not** authoritative protocol traces. Behavior/security requirements take precedence over incidental mockup details.

## Success criteria

A learner loads fixture samples, selects one, and immediately recognizes **who sent what to whom, via which channel, and what can truly be observed**. The canvas, timeline, and inspector remain consistent. Selecting another mission fixture changes content, not shell code.

The refinement is complete when:

1. Catalog and workspace visibly follow the original references, with comparison evidence for composition, typography, surfaces, accents and focal hierarchy.
2. Hierarchy comes from layout, spacing and restrained emphasis instead of repetitive generic card/border styling.
3. Sequence participants, lifelines and directional arrows align correctly, and message labels do not overlap labels, arrows or actors.
4. Event selection consistently highlights involved actors/path and updates the Inspector's channel, explanation and evidence classification.
5. The same visual system and generic renderer support both existing missions without protocol-specific shell logic or fabricated ePA events.
6. Existing functional/accessibility checks and focused rendering checks pass; narrow and actual 200% zoom content remains accessible without overlap or clipping. Diagram-local horizontal scrolling is acceptable.
7. Strict OpenSpec validation passes.
8. Visual comparison results, screenshots, modified components, build/test results and remaining issues are documented. If actual browser zoom cannot be exercised, it remains explicitly Not verified with a manual walkthrough; viewport resizing cannot close that item or support a claim of full zoom verification.

## Dependency and rollout

This change may be reviewed and implemented independently of the ongoing `001-oidc-pkce` change, but must not modify or archive that change. Once the UX baseline is accepted and verified, use it as the front-end contract for real event instrumentation in later slices.

## Authorization and verification history

The owner's earlier apply request authorized the original frontend baseline. The 2026-10-18 request specifies this visual refinement within the same change; it does not approve final visuals in advance. Preserve all original completed tasks and the existing `verification.md`, including warning W1 about untested actual browser zoom. Append new evidence during implementation without replacing the earlier report or treating its visual assessment as acceptance of this revision.

This scope does not authorize Slice 002, `001-oidc-pkce`, real authentication, NestJS/BFF work, Keycloak integration, protected APIs or infrastructure.
