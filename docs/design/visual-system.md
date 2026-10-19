# Visual System — Design Tokens and Interaction Guidance

**Status:** DRAFT / UNAPPROVED · **Version:** 0.1

## Direction

A credible developer workstation: dark navy surfaces, clear hierarchy, restrained cyan emphasis and readable technical metadata. Avoid an imitation terminal, over-decorated game, or generic admin dashboard.

## Proposed colors (subject to accessibility testing)

| Token      | Hex       | Purpose                            |
| ---------- | --------- | ---------------------------------- |
| Canvas     | `#0B1020` | Page background                    |
| Panel      | `#141D2E` | Card and inspector surfaces        |
| Border     | `#2B3A50` | Grouping                           |
| Foreground | `#EDF4FC` | Primary readable text              |
| Muted      | `#B6C7D9` | Supporting copy                    |
| Accent     | `#4DD4FF` | Selected step and primary emphasis |
| Positive   | `#58D69B` | Successful **observed** result     |
| Caution    | `#FFBF5C` | Important nuance / warning         |
| Negative   | `#FF7C8A` | Denied or failed result            |

Colors indicate state **with text and icons**, never alone. Audit contrast in the actual UI; swatches here are provisional.

## Typography and spacing

For the 2026-10-18 `mission-control-design-foundation` refinement, use at least 14px for normal explanations and controls, 13px for participant/message labels and 12px for ancillary metadata. Normal prose line height is at least 1.4. Keep the selected interaction prominent with a cyan path, weight/surface emphasis and a visible Selected badge; unrelated paths remain readable but subdued. Share 4/8px spacing increments and consistent control/surface styles. At narrow widths, stack panels and retain access to both the diagram and its text alternative. Fit/map zoom must preserve displayed text minimums and use diagram-local horizontal scrolling instead of shrinking below them; actual 100%/200% browser zoom is verified separately.

- Clear UI sans-serif for general copy; monospace for safe protocol fields such as `response_type=code`.
- One dominant title per screen; text minimums to be reviewed at 100% browser zoom and 1366×768.
- Suggested 8-point spacing system; calm panel spacing and visible dividers.
- Avoid drawing dense sequence messages with tiny unreadable labels.

## Visual semantics

- **Observed**: explicit source name, timestamp and verified event status.
- **Explained**: book/info icon and textual narration, not a green verification icon.
- **Front channel**: solid path through browser (style to validate).
- **Back channel**: visually distinct line and legend (style to validate).
- **Selected step**: emphasis plus label + accessible focus.
- **Planned mission**: visible status, not a disabled-but-clickable fake action.

## Required component states

The fixture canvas renders front-channel messages as solid directed lines, back-channel messages as dashed directed lines, and internal notes as actor-local dotted annotations. Mission declarations supply the legend labels. Every encoding includes a visible text label; internal annotations have no arrowhead. Keyboard focus is distinct from active selection. No animation or fabricated network progress is needed.

Primary/secondary/disabled buttons, card selection, loading, keyboard focus, empty timeline, inspector with missing evidence, validation failure, recoverable error, complete run, and visited learning checkpoint.

## Reference image caution

The PNGs in `assets/` came from exploratory high-fidelity mockups and contain concept-only elements. They are **not pixel-perfect implementation specifications**; prioritize the written design and verified flow semantics over illustration inaccuracies.

## Approval questions

- Does the catalog feel like a useful engineering tool rather than a space game?
- Can a learner differentiate learning progress from successful authentication?
- Is the inspector readable without horizontal scrolling?
- Is `Observed` sufficiently different from `Explanation`?
- Is the actor map still understandable with non-OAuth fixtures?
