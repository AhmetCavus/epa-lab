# Capability-first Refactoring — Verification

**Date:** 2026-10-19  
**Status:** IMPLEMENTED — all structural/refactoring checks below pass. The owner's apply request authorized this frontend change; OAuth/backend work remains DRAFT. This change is unarchived.

## Baseline

- Fresh `npm --prefix apps/playground test`: production TypeScript/Vite build and all **12 existing browser/layout tests passed**, including 12 axe scans with no reported A/AA findings.
- Saved 42 source/test/style/asset/tooling/prior-change files and SHA-256 hashes under `apps/playground/.cache/architecture-refactor/baseline-files/` and `baseline-manifest.json`. These preserve the current dirty working tree; no commit reset or staging operation was used.
- Captured **32 fresh screenshots** using the local production preview on port 5176: catalog, both previews, empty/loaded/front/back/internal selection, reset, replay and unknown mission at native Chrome page zoom 100%/200%, plus desktop/intermediate/narrow views. Chrome 155.0.8059.84 used native settings in one window; Chromium 141.0.7390.37 covers 1366/1024/390/320 CSS widths. Ten additional axe scans passed during native-zoom capture. Exact dimensions, zoom and paths are in the [baseline evidence manifest](../../../apps/playground/.cache/architecture-refactor/before/browser-evidence.json).
- Both design reference PNGs were inspected. The acceptance baseline for this structural change is the current rendered application, not a redesign against those references.
- Reuse the owner's existing Accepted [ADR-0003](../../../docs/architecture/decisions/ADR-0003-capability-first-code-organization.md). Planning references were aligned to its actual filename; no duplicate ADR is created.

Local evidence and browser profiles are ignored artifacts, separate from the prior design-foundation captures and reports.

## Previous and New Source Organization

Previously, app composition lived directly under `src/`, catalog presentation under `catalog/`, all models/fixtures/lookup under `missions/`, and routing, coordination and generic presentation under `workspace/`.

```text
src/
  main.tsx                         # retained Vite entry; only App import changed
  styles.css                       # byte-identical
  app/
    App.tsx
    NotFound.tsx
    WorkspaceRoute.tsx
  features/
    mission/
      index.ts
      ui/Catalog.tsx
      ui/Workspace.tsx
      application/mission-catalog.ts
      application/useMissionWorkspace.ts
      domain/mission.ts
      data/registry.ts
      data/oauth.ts
      data/epa.ts
    protocol-flow/
      index.ts
      contracts.ts
      selection.ts
      ui/ActorCanvas.tsx
      ui/InteractionPaths.tsx
      ui/interaction-layout.ts
      ui/Inspector.tsx
      ui/Timeline.tsx
      application/useProtocolSelection.ts
      domain/protocol-flow.ts
```

No `shared/`, protocol-flow data folder, empty layer, model layer, repository interface, plugin loader or runtime framework was introduced. The old catalog/missions/workspace directories are removed after their consumers migrated.

## Moved and Changed Files

Paths below are relative to `apps/playground/src/`. The local [move manifest](../../../apps/playground/.cache/architecture-refactor/moves.json) and saved baseline files support reviewing/reversing this refactor without resetting the owner's working tree.

| Before                                                                 | After / focused change                                                                                                                       |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `App.tsx`, `NotFound.tsx`                                              | `app/App.tsx`, `app/NotFound.tsx`; same markup, titles, focus behavior and navigation                                                        |
| Route wrapper inside `workspace/Workspace.tsx`                         | `app/WorkspaceRoute.tsx`; same lookup/recovery and keyed workspace remount                                                                   |
| `catalog/Catalog.tsx`                                                  | `features/mission/ui/Catalog.tsx`; implementation retained, imports updated                                                                  |
| Workspace presentation                                                 | `features/mission/ui/Workspace.tsx`; existing JSX consumes coordination hooks; zoom/Fit/scroll and document title stay in UI                 |
| `missions/mission.ts`                                                  | Split into mission `domain/mission.ts` and protocol-flow `domain/protocol-flow.ts`; canonical declarations moved without shape/union changes |
| `missions/oauth.ts`, `missions/epa.ts`                                 | Mission `data/`; only contract import locations changed, all fixture/projection bodies identical                                             |
| `missions/registry.ts`                                                 | Registry array remains in mission `data/registry.ts`; existing lookup and list access belong to `application/mission-catalog.ts`             |
| ActorCanvas, InteractionPaths, interaction-layout, Inspector, Timeline | Protocol-flow `ui/`; rendering/geometry retained, owning contract imports updated                                                            |
| Inspector's mission Checkpoint input                                   | Two presentation inputs, `contextTitle` and `contextExplanation`; same event/actor/checkpoint fallback ordering and rendered content         |
| `main.tsx`                                                             | Imports `app/App`; stylesheet import and order unchanged                                                                                     |
| `tests/sequence-layout.spec.ts`                                        | Public protocol-flow type/component imports; existing assertions retained                                                                    |
| New `tests/architecture.spec.ts`                                       | Three Node-side architecture checks using installed TypeScript and the existing Playwright runner                                            |

`AGENTS.md` records the structural authorization and concise layer/public-interface/dependency rules. The UI README documents current source ownership and coordination. This change's proposal/design/tasks reference the actual owner-provided ADR filename and implementation status. Earlier changes, specs, UX documents, design assets, tests other than the layout-test import paths, and backend/runtime tooling are preserved.

## Introduced Coordination and Public Interfaces

- `useProtocolSelection` owns the one existing inspection union and derives the selected actor/event and highlights from neutral inputs. Actor and event selection, clearing and learning context stay synchronized without mission/protocol-specific dependencies.
- `useMissionWorkspace` owns existing checkpoint/fixture/loading/announcement/replay/reset coordination and composes protocol selection. Map state and DOM work stay in the Workspace UI. Retained checkpoint context is independent of inspection, loaded records survive Reset, and route changes/refresh discard transient state exactly as before.
- Mission's public entry exposes Catalog, Workspace and mission lookup to app composition. Protocol-flow separates its type-only `contracts.ts`, application `selection.ts` and UI `index.ts`, preventing domain/application consumers from importing a UI barrel. Internal imports go directly to owning modules.

These are the two real state-coordination responsibilities and the small public boundaries needed by existing consumers. No new business models, global store, service/controller class, factory or dependency-injection abstraction was added. `mission-catalog.ts` uses the original lookup over the single static registry; it does not duplicate data or wrap a nonexistent repository.

## ADR and Architectural Checks

The owner supplied [ADR-0003-capability-first-code-organization.md](../../../docs/architecture/decisions/ADR-0003-capability-first-code-organization.md), already **Accepted**, dated 2026-10-19. It was reused intact; no second ADR-0003 was created. The plan's earlier `capability-first-layering` filename was reconciled to this document. Existing ADR-0001/0002 and OAuth/backend approvals were not changed.

All three architecture checks pass:

1. TypeScript resolves source imports, type-only imports, re-exports and literal dynamic imports. The production graph obeys layer/capability/public-entry rules with no unresolved local dependency or cycle.
2. Domains compile using only the ES2022 library and no ambient framework/browser types. The eleven existing canonical type declarations have exactly one owning domain declaration; the pure interaction helper is also retained unchanged.
3. Negative cases show the checker rejects reverse mission imports into protocol-flow, domain/UI edges, direct UI/registry access, cross-capability internal application imports and a constructed cycle.

A source audit also compares the original twelve declarations (eleven contracts plus `interactionActorIds`) with their relocated TypeScript AST output, and both mission fixture bodies with their original AST output. All match. Twenty-four protected style/asset/package/config/prior-change files have identical SHA-256 hashes. See the local [source equivalence results](../../../apps/playground/.cache/architecture-refactor/source-equivalence.json).

## Functional, Accessibility and Build Results

| Check                                                                 | Result                                                                                                                           |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `npm --prefix apps/playground run typecheck`                          | Passed strict TypeScript                                                                                                         |
| `npm --prefix apps/playground run build`                              | Passed production Vite build; existing stylesheet artifact hash remains `index-BoiGZp70.css`                                     |
| `npm --prefix apps/playground test`                                   | **15/15 passed**: all 12 retained browser/layout tests plus 3 architecture checks                                                |
| Accessibility scans                                                   | **22 after-refactor scans passed** with zero reported A/AA findings: 12 in the browser suite, 10 in native browser-zoom captures |
| `npm --prefix apps/playground run format:check`                       | Passed                                                                                                                           |
| `openspec validate capability-first-arch-refactoring --strict --json` | Passed; informational `skip_specs` notice only                                                                                   |
| `git diff --check`                                                    | Passed; existing Windows line-ending notices are informational                                                                   |

Focused build/navigation/selection/geometry checks also passed after each move/extraction. An initial strict TypeScript check of the new architecture test caught one unused import; it was removed before the final checks. No product failure was observed. There is no separately configured unit-test script/suite; pure architecture assertions run through the existing test runner, and a nonexistent unit command was not claimed as executed.

The preserved tests cover catalog preview/back/forward/direct/unknown routes, keyboard focus, checkpoint independence, actor/event highlighting, canvas/timeline/Inspector synchronization, fixture loading, replay/reset, refresh/mission-switch reset, conceptual-only ePA, safe evidence, arrow direction and wrapping/alignment, narrow reflow, reduced motion and no external API/storage/cookie behavior. No real OAuth operation was performed.

## Visual Equivalence and Native Browser Zoom

The [after-capture manifest](../../../apps/playground/.cache/architecture-refactor/after/browser-evidence.json) uses the same browser versions, dimensions, states and zoom settings as the fresh baseline. Images were compared as decoded RGBA pixels, not merely by PNG file size or screenshot appearance.

| Matched state set                                                     | Evidence                                                                                                                                                            | Result                                                                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Native Chrome 155.0.8059.84, page zoom 100% and 200%                  | `before/zoom-{100,200}` and `after/zoom-{100,200}`: catalog, empty, loaded, front, selected back-channel, internal, reset, replay, conceptual ePA and unknown route | Equivalent state, geometry and rendering; controls/Inspector remain reachable, diagram scrolling remains local |
| Chromium 141.0.7390.37 at 1366×768, 1024×768, 390×844 and 320×844 CSS | `before/width-*` and `after/width-*`: catalog, selected workspace, conceptual ePA                                                                                   | Equivalent desktop/intermediate/narrow rendering                                                               |
| Initial decoded pixel comparison                                      | [32-pair results](../../../apps/playground/.cache/architecture-refactor/visual-comparison.json)                                                                     | **29/32 immediately pixel-identical**; three capture differences investigated below                            |
| Controlled comparison of the three differing states                   | [Settled-state results](../../../apps/playground/.cache/architecture-refactor/stable/comparison.json)                                                               | **3/3 pixel-identical**; zero differing pixels after matched pointer/font/paint settling                       |

The first captures differed for the 100% loaded workspace (40,779 pixels), 200% loaded workspace (5 pixels) and 320px catalog (37,430 pixels), despite matching dimensions and unchanged styles. They were not silently accepted or rebaselined. An isolated Vite build from the saved pre-refactor source produced the same original JS/CSS artifact names as the fresh initial baseline and was served separately on port 5177. Comparing that original application against the final build with a neutral pointer, ready fonts and 250ms paint/transition settling yields zero pixel differences in all three cases. No application code or CSS was changed to obtain this result. The differences are capture-state/timing artifacts; all 32 assessed states have equivalent rendering, with no unexplained visual difference remaining.

Native browser zoom used Chrome's own settings API in an isolated profile, with the same 1366×900 outer window: 100% gives 1344×746 CSS pixels and DPR 1; 200% gives 672×373 CSS pixels and DPR 2. CDP independently reports native zoom 1/2, while visual viewport scale remains 1. Full-page captures use native content bounds. This is actual page zoom, not a reduced viewport/device-scale/map-zoom substitute. Fit/Reset leave browser zoom unchanged. No zoom check is outstanding for the assessed native Chrome session.

Example captures:

- Catalog [before](../../../apps/playground/.cache/architecture-refactor/before/width-1366/catalog.png) / [after](../../../apps/playground/.cache/architecture-refactor/after/width-1366/catalog.png).
- Selected workspace [before](../../../apps/playground/.cache/architecture-refactor/before/width-1366/selected.png) / [after](../../../apps/playground/.cache/architecture-refactor/after/width-1366/selected.png).
- Actual 200% selected workspace [before](../../../apps/playground/.cache/architecture-refactor/before/zoom-200/selected.png) / [after](../../../apps/playground/.cache/architecture-refactor/after/zoom-200/selected.png).
- Controlled loaded-state comparison [original](../../../apps/playground/.cache/architecture-refactor/stable/loaded-1-before.png) / [refactored](../../../apps/playground/.cache/architecture-refactor/stable/loaded-1-after.png).

## Remaining Concerns and Scope

No blocking architectural issue, import cycle, duplicate canonical model, protocol-specific visualization dependency or unexplained visual/functional change remains in the checked implementation. The explicit entry-point policy and its check should evolve only when a real capability/consumer requires it. Full screen-reader conformance and other browser engines were not newly assessed; automated scans do not establish full accessibility conformance.

No dependencies, backend/services, infrastructure, Android placeholder or root runtime configuration changed. All five `001-oidc-pkce` artifacts and all prior design-foundation artifacts retain baseline hashes; their historical paths/evidence remain intact and the move map explains current locations. Styling and every design asset, including the owner's additional untracked artwork, retain original bytes. No user changes were staged/reset or overwritten.

The implementation is ready for OpenSpec verification/review. This change remains unarchived, and neither OAuth integration nor Slice 002 was started.
