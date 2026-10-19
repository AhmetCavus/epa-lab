# Capability-first Frontend Layering

**Status:** IMPLEMENTED — capability ownership, dependency rules and preserved behavior are verified in `verification.md`.  
**Inspection date:** 2026-10-19

## Context

See `proposal.md` for motivation and scope. The inspected application is a small React/TypeScript/Vite package, independent of the repository's existing backend. Its current source organization is:

```text
src/
  App.tsx, NotFound.tsx, main.tsx, styles.css
  catalog/Catalog.tsx
  missions/mission.ts, registry.ts, oauth.ts, epa.ts
  workspace/Workspace.tsx, ActorCanvas.tsx, InteractionPaths.tsx,
            interaction-layout.ts, Inspector.tsx, Timeline.tsx
```

`missions/mission.ts` declares both mission/checkpoint contracts and generic actor/event/channel/evidence contracts. Catalog reads the static registry directly. Workspace performs route lookup, owns checkpoint/loading/inspection/map state, derives synchronized selections and renders all panels. Inspector imports `Checkpoint` despite needing only its title and explanation. Diagram geometry and DOM observers are already cohesive presentation responsibilities. Existing tests include browser/accessibility regressions and a real-component static-render geometry test; `package.json` has no separate unit-test script.

The checkout contains existing staged/unstaged work and additional design assets. Its current contents, rather than an earlier commit or historical screenshot, are the refactor baseline. No product or protocol behavior needs a new spec delta; OpenSpec explicitly skips specs for this change.

## Goals / Non-Goals

**Goals:** Make mission and protocol-flow ownership explicit; separate existing coordination from presentation; keep neutral models canonical and framework-independent; expose narrow, acyclic interfaces; preserve current DOM, rendering and state semantics.

**Non-goals:** Changing models/terminology, redesigning components or styles, adding mission states, expanding fixtures, introducing runtime registration, changing backend boundaries or creating unused directory layers. No new dependencies or application initialization.

## Decisions

### 1. Move existing code into two capabilities

The concrete target is intentionally smaller than a complete layer scaffold:

```text
src/
  main.tsx
  styles.css
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

Keep `main.tsx` as Vite's existing entry and `styles.css` at its current path with identical bytes/import order. There is no demonstrated reusable UI primitive to extract, so do not create `shared/ui/`. Protocol-flow consumes supplied records and needs no data adapter, so omit its `data/`. No empty folders, placeholder files or `model/` layer.

| Existing file or responsibility                                                                      | Destination / ownership                           | Permitted change                                                                                              |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `App.tsx`, `NotFound.tsx`                                                                            | `app/`                                            | Import paths and composition wiring; retain markup, focus and title behavior                                  |
| `WorkspaceRoute` inside `workspace/Workspace.tsx`                                                    | `app/WorkspaceRoute.tsx`                          | Keep URL lookup, unknown-route recovery and `key={mission.id}` remount semantics                              |
| `catalog/Catalog.tsx`, including local artwork/card helpers                                          | `features/mission/ui/Catalog.tsx`                 | Move intact; read the catalog through the application module                                                  |
| Workspace presentation                                                                               | `features/mission/ui/Workspace.tsx`               | Consume application hooks; preserve existing JSX and handlers' observable effects                             |
| `Checkpoint`, `MissionPreview`, `Mission`                                                            | `features/mission/domain/mission.ts`              | Move declarations without changing shapes; reference neutral protocol contracts                               |
| `Actor`, `ActorGroup`, `EvidenceField`, channel types, `FixtureEvent` and its private common content | `features/protocol-flow/domain/protocol-flow.ts`  | Move existing declarations without renaming or broadening unions                                              |
| `interactionActorIds`                                                                                | Same protocol-flow domain module                  | Preserve the pure helper and its semantics                                                                    |
| Mission array in `missions/registry.ts`                                                              | `features/mission/data/registry.ts`               | Preserve the same explicit imports, order and entries                                                         |
| Existing `findMission` plus catalog list access                                                      | `features/mission/application/mission-catalog.ts` | Move existing lookup; re-export the registered list, with no duplicate registry or invented repository        |
| `missions/oauth.ts`, `missions/epa.ts`                                                               | `features/mission/data/`                          | Import changes only; retain IDs, text, order, availability and typed safe-evidence projection                 |
| ActorCanvas, InteractionPaths, Inspector, Timeline                                                   | `features/protocol-flow/ui/`                      | Move components; neutral contract imports and the Inspector input adjustment below                            |
| `workspace/interaction-layout.ts`                                                                    | `features/protocol-flow/ui/interaction-layout.ts` | Preserve presentation geometry/constants; framework independence alone does not make geometry a business rule |

Renaming all existing types to the examples in the request would create unrelated churn. Preserve names such as `Actor` and `FixtureEvent`, including the distinction between directed messages and internal annotations. Do not add `MissionStatus`, `EvidenceClassification` or observed/live variants where the current model uses existing inline unions.

### 2. Extract only real coordination

`useProtocolSelection` owns the current single inspection union (`learning`, `actor`, `interaction`), selection actions, selected actor/event derivation and involved-actor highlighting. Inputs are neutral actors, events and the current learning-context actor IDs. It knows nothing about mission IDs, registry, OAuth, OIDC, Keycloak or ePA. Export a clear-selection action for changing learning context/reset. There must not be a second inspection selection in the mission hook or UI.

`useMissionWorkspace` owns the retained checkpoint ID, fixture loading flag and announcements; derives the current checkpoint/index, mission actors and available fixture records; composes the protocol selection hook. Move existing checkpoint/load/replay/reset coordination into it. Actor/event inspection keeps the retained checkpoint. Checkpoint navigation clears active inspection without loading records. Replay selects the existing first sample. Reset clears checkpoint/inspection while preserving loaded samples.

Map scale, viewport ref, DOM scrolling, ResizeObserver, title effects and canvas Fit stay in UI. The existing Reset view handler composes the application's reset with resetting local map scale to 1. Preserve the 100% readable floor, 150% maximum, 25-point zoom steps, Fit scroll reset and all announcement strings. Keep synchronous fixture loading, route-driven state disposal and no persistence/global state. No controller, context provider, reducer framework or DI layer is needed.

A folders-only move would leave mixed coordination intact; extracting a hook for every component or trivial getter would add unnecessary indirection. These two hooks correspond to the two actual coordination responsibilities.

### 3. Keep dependency direction explicit

The three protocol-flow entry modules are small named-export boundaries, not new runtime abstractions:

- `contracts.ts`: type-only exports of existing neutral domain contracts; no React/UI/application exports.
- `selection.ts`: the application hook export, consumed by mission application coordination.
- `index.ts`: the existing generic UI exports ActorCanvas, Inspector and Timeline, consumed by mission UI and the real-component layout test. InteractionPaths and geometry remain internal UI collaborators.

Mission's `index.ts` exposes Catalog, Workspace and `findMission` to app composition. Inside each capability, import the owning modules directly rather than routing internal imports back through its own barrel. Separate protocol-flow entry modules prevent a domain or application import from pulling in a UI barrel.

| Consumer                  | Allowed project dependencies                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| `app/`                    | App siblings and mission public entry; composition/router/browser UI concerns                  |
| Mission UI                | Own UI/application/domain; protocol-flow UI public entry                                       |
| Mission application       | Own application/domain/data; protocol-flow selection and domain-contract public entries        |
| Mission domain            | Own domain; type-only protocol-flow contracts                                                  |
| Mission data              | Own domain; protocol-flow contracts; sibling fixture modules                                   |
| Protocol-flow UI          | Own UI/application/domain; React/browser APIs needed for presentation                          |
| Protocol-flow application | Own application/domain and React hooks; no browser DOM, mission imports or data-specific logic |
| Protocol-flow domain      | Its own pure domain modules only; no framework, browser, network or persistence dependency     |

Data adapters cannot depend on application/UI. Application cannot depend on UI. Domains cannot depend on application, data, app or UI. Protocol-flow cannot import mission in any layer. Cross-capability access uses the named public entries above; type-only imports and re-exports are included in boundary/cycle review.

### 4. Remove Inspector's reverse mission dependency

Inspector currently uses `checkpoint?.title` and `checkpoint?.explanation`. Replace its mission `Checkpoint` prop with two UI presentation inputs, `contextTitle` and `contextExplanation`, supplied by Workspace from the same selected checkpoint. Preserve all current event/actor/context fallback ordering, copy, provenance fields and DOM. This creates no second checkpoint model and leaves the canonical `Checkpoint` in mission domain. Generic Inspector remains independent of mission contracts and fixture implementations.

### 5. Document the accepted decision and enforce it proportionally

The owner has supplied `docs/architecture/decisions/ADR-0003-capability-first-code-organization.md` with **Status: Accepted**, dated 2026-10-19. Reuse this existing decision; do not create a second ADR-0003. Keep it aligned with the implementation and retain its context, decision and scope. It documents:

- Context: current small fixture frontend and the mixed model/Workspace ownership above.
- Decision: the concrete capability/layer ownership and move-first strategy.
- Layer responsibilities and capability boundaries: the tables above, including absent unused layers and retained stylesheet entry.
- Dependency direction: permitted public entries and prohibited reverse edges, including framework-free domain and protocol-flow independence.
- Consequences: shorter presentation components, explicit cross-capability APIs and import/test-path migration cost, with unchanged observable behavior.
- Explicitly rejected overengineering: repositories without a data-access need, controller/factory/service classes, DI, global state, a plugin loader, universal protocol DSL, empty layers and speculative shared components.

Acceptance of this frontend organization does not accept the existing backend ADRs, approve OAuth implementation or imply the refactor has been verified. Preserve those statuses and all previous verification history.

Add concise rules to `AGENTS.md` tied to this ADR: organize frontend code by capability then responsibility; UI uses application/domain instead of importing registries; application owns use-case coordination and may use data directly; domains stay canonical/framework-independent; data depends on domain; cross-capability imports use explicit public entries with no cycles; generic protocol-flow never imports mission implementations; add layers/shared code only for actual consumers. Retain the security/fixture authorization instructions. Update the package source-layout guide; leave UX behavior documents and images intact because behavior does not change.

### 6. Check architecture with installed tooling

Add a focused Node-side architecture test under the existing Playwright runner, using the installed TypeScript compiler API for module resolution/import and re-export traversal. Check resolvable local imports, the dependency table (including public exports), an acyclic source graph and no framework/browser/data access in domain. Avoid regex-only checks that flag protocol names appearing in comments or educational strings as imports. Audit canonical declarations to ensure types are moved, not copied. No new linter, graph package or test framework is needed.

Keep existing browser/layout assertions. Update `tests/sequence-layout.spec.ts` to consume public protocol-flow type/UI entries; its `src/styles.css` path remains valid. Existing React JSX pragmas stay with moved components. The project currently has no separate unit suite; report that fact, run all existing tests, and include the architecture assertions in that runner rather than inventing an unrun unit-test command.

## Risks / Trade-offs

- Model separation could create a mission ↔ protocol-flow cycle → one-way neutral contracts and scalar Inspector context inputs; test type-only edges as well as runtime imports.
- Hook extraction could change selection/reset lifecycle → retain one inspection identity and the keyed Workspace remount; keep existing transition tests unchanged.
- Moved JSX or styles could change DOM/useId, focus, layout or asset URLs → avoid new wrapper elements; retain markup, strings, constants, React pragmas, stylesheet bytes/order and asset paths; compare fresh screenshots.
- Public barrels could accidentally reintroduce UI dependencies → keep contract/selection/UI entries separate and keep internal imports direct.
- Existing working changes or missing local screenshots could be overwritten → establish a fresh working-tree baseline; retain historical evidence and user edits; report missing captures rather than recreating them from an old commit.

## Migration Plan and Verification

1. Before source edits, capture the actual working frontend and source/assets/style hashes, plus current test/build results. Use the same browser/version, viewport, zoom and selected states for after captures. Do not use old reference PNGs as pixel-regression baselines.
2. Move/split canonical contracts, fixture data and lookup first; update dependent imports and verify TypeScript. Temporary legacy source locations may remain only while consumers migrate; never keep duplicate canonical models.
3. Move app routes and capability UI incrementally. Extract the two coordination hooks, adjust Inspector context inputs and update tests in the same relevant step. Remove obsolete files after their consumers are migrated.
4. Record the Accepted ADR and AGENTS rules, then run the dependency check and existing checks. No blanket reset/clean of this dirty checkout; rollback only this refactor's own moves/extractions if needed.
5. Run `npm --prefix apps/playground run typecheck`, `run build`, `test` and `run format:check`; run `openspec validate capability-first-arch-refactoring --strict --json`. Build includes TypeScript, and `test` includes build plus the current 12 browser/layout tests and accessibility scans. Record the new architecture-test result separately. Run existing separate unit tests only if one is present by apply time, otherwise state none is configured.
6. Compare catalog, both workspace previews, empty/loaded/front/back/internal selection, replay/reset and unknown-route recovery before/after; verify keyboard focus, timeline/Inspector synchronization, fixture evidence and no external API/storage/session behavior. Include desktop 1366px, intermediate 1024px, narrow 390/320px, reduced motion and actual 100%/200% browser zoom using matched captures. Viewport/device scaling is not actual zoom evidence. Styles/assets should be byte-identical; investigate every screenshot difference rather than rebaseline a changed design. Report genuine nondeterministic capture differences or unavailable checks explicitly.
7. Write a dated verification report for this change: previous/new tree and moved/changed files, ADR, the two hooks/public entries and their justification, command results, visual comparisons and remaining architectural concerns. Keep both earlier changes unmodified; do not archive or start Slice 002.

There are no unresolved architectural choices needed before this plan can be implemented. Folder omission and retaining the stylesheet entry are intentional decisions, not deferred scaffolding.
