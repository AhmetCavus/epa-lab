# Tasks — Mission Control Design Foundation

**Status:** IMPLEMENTED — 21/21 tasks complete, including all 10 tasks from the 2026-10-18 visual refinement. The 11 original tasks remain complete as historical baseline work. Dated evidence, screenshots and actual 100%/200% browser-zoom results are appended to `verification.md`; final owner visual review remains separate. Real OAuth/backend work and Slice 002 remain outside scope.

## Baseline (design approval)

- [x] Confirm the two open interaction decisions in `design.md` (recommendations are provided).
- [x] Align `docs/design/mission-workspace.md`, `mission-catalog.md`, `visual-system.md` with this change only where needed; keep existing reference PNGs.

## One focused frontend slice

- [x] Remove the hardcoded ePA reference from generic catalog copy; use mission-neutral wording.
- [x] Add minimal mission-defined typed directed interactions, with explicit separate treatment for non-observable provider-internal annotations.
- [x] Connect timeline selection to canvas edge/actor emphasis and inspector details; support keyboard interaction.
- [x] Define visible front/back/internal channel labels, legend and clear focus styling.
- [x] Improve workspace text sizes, proportions and selected-state hierarchy while preserving current layout and components.
- [x] Check both OAuth and conceptual ePA fixture through the same generic workspace (no protocol-specific conditions).

## Quick verification

- [x] Verify selected fixture → directed highlight → correct inspector, plus no-observation semantics.
- [x] Run existing build, browser tests, accessibility scans and applicable OpenSpec validation.
- [x] Review before/after screenshots against `docs/design/assets/*concept.png`; record important justified differences.

## 1. Reference-led catalog and workspace refinement

- [x] 1.1 Inspect both original PNGs and capture the current Catalog, empty/loaded Workspace and selected-event baseline before editing where feasible. Verify a short comparison identifies hierarchy, typography, surfaces, artwork and diagram shortcomings; record screenshot paths and any unavailable baseline. Preserve original captures and verification history.
- [x] 1.2 Refine the existing Catalog's hero, mission artwork, card anatomy, spacing, typography and action feedback using the reference direction. Verify desktop/narrow screenshots, aligned actions, keyboard navigation and unchanged Fixture preview / Planned semantics for both current mission entries.
- [x] 1.3 Refine existing Workspace/components and shared styles so the canvas dominates, side panels are quieter and typography/spacing/states are consistent. Verify minimum displayed text sizes, panel alignment and Inspector access at 1366, 1024, 390 and 320 CSS pixel widths; attach rendered comparisons, not only functional assertions.

## 2. Reliable sequence presentation and feedback

- [x] 2.1 Improve the existing participant/layout/path components using shared participant-center, lifeline and endpoint geometry. Verify both arrow directions, uneven groups and the 2px alignment tolerance with focused browser assertions; show separate AS/IdP participants under one deployment and no network arrow for internal operations. Explain any demonstrated need for a focused renderer replacement before making it.
- [x] 2.2 Replace fixed-height message-row assumptions with content-aware spacing and separate text/path areas. Verify long/wrapped labels, channel/evidence text, narrow layouts and changed text layout have no label/label, label/arrow or label/header collisions; confirm diagram, timeline and replay preserve supplied explanation order. Include representative layout test cases without inventing shipped ePA events.
- [x] 2.3 Make Fit/map zoom respect legible displayed text minimums and retain diagram-local horizontal scrolling; implement responsive panel reflow without page-wide horizontal overflow. Verify all participants, paths, controls, Inspector and structured alternative remain reachable through resize, Fit, Reset and keyboard navigation; map controls must not compensate for browser zoom.
- [x] 2.4 Strengthen synchronized actors/path/timeline/Inspector selection and distinct hover/focus/selected/disabled feedback. Verify both mouse and keyboard, previous-selection clearing, text/shape channel encoding, minimum targets/contrast and reduced motion; retain explicit example labels, Not observable internal checks, existing mission definitions/registration and conceptual-only ePA behavior.

## 3. Integrated visual verification and report

- [x] 3.1 Run the existing TypeScript/production build, browser regressions and accessibility scans plus focused layout/selection checks; run package formatting and strict OpenSpec validation. Record commands/results, including failures, and confirm no Slice 002, OAuth/backend, infrastructure or unrelated changes were introduced.
- [x] 3.2 Capture Catalog and both workspaces in a supported desktop browser at actual page zoom 100% and 200% using the same window; include loaded/selected communications and internal annotations where defined. Verify no overlapping/clipped essential content and usable focus/scrolling; record browser/version, dimensions and actual zoom. If unavailable, explicitly leave W1/actual zoom Not verified with its reason and outstanding manual walkthrough; resizing/device scaling alone cannot pass this check.
- [x] 3.3 Append a dated refinement report to `verification.md` preserving the original report and W1 history. Include the design's screenshot matrix, before/after comparisons where feasible, per-area visual results against both PNGs, components modified, build/test/OpenSpec results, justified deviations and remaining issues/limitations. Verify the report covers all proposal success criteria and does not claim unperformed checks or final visual acceptance in advance.

## Exit condition

A polished, stable and mission-neutral Mission Control meets the revised proposal/spec/design criteria with rendered visual evidence, without backend/auth implementation or speculative refactoring. All original requirements remain in force. An unavailable actual-browser-zoom check must remain an explicit outstanding manual item, not a claimed pass. Keep `001-oidc-pkce` open, DRAFT and unchanged; do not begin Slice 002.
