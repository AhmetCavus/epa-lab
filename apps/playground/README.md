# Auth Protocol Playground — UI Slice 001

An isolated React/TypeScript browser app for the authorized fixture-only Catalog and Mission Control Workspace. It coexists with the existing `epa-auth-lab` services without calling or changing them. It is intentionally independent of the root's backend-only pnpm commands and workspace membership.

From the repository root, with Node 24:

```sh
npm --prefix apps/playground ci
npm --prefix apps/playground run dev
```

Open <http://127.0.0.1:5173/missions>. Both workspace routes also support direct navigation:

- `/missions/oauth-oidc/workspace`: initially empty; explicitly load fixture samples to explore the timeline and Safe Evidence inspector.
- `/missions/epa-concept/workspace`: planned, conceptual actor/checkpoint layout, with no telemetry or simulated operational results.

Selecting a learning checkpoint never loads events or executes anything. Replay explanation selects the first loaded sample. Reset view clears selections and restores the map scale while retaining loaded samples. Fit returns to the readable 100% map scale; narrow diagrams scroll horizontally instead of shrinking essential text. Map controls never change browser page zoom. Refreshing or changing mission discards transient UI state; there is no persistence, session, backend connection or credential handling.

The Mission Control design foundation adds directed fixture paths under actor swimlanes. Select a path or timeline sample to inspect the same interaction; unrelated paths remain visible. Mission-defined channel labels accompany solid/dashed lines. Internal checks use a separate actor-local annotation labeled Not observable, with no network arrow. The structured map alternative describes roles, endpoints and channel semantics.

The visual refinement keeps participant centers/lifelines aligned, uses content-sized message rows with separate arrow bands and strengthens selected-state feedback. `tests/sequence-layout.spec.ts` checks endpoint alignment, long wrapped labels, reverse arrows, uneven groups, ordering and readable Fit. Its synthetic layout content is test-only and is not a registered mission. Actual Chrome page zoom at 100% and 200% is recorded separately in the change's verification report; viewport/device-scale tests remain supplementary.

```sh
npm --prefix apps/playground run typecheck
npm --prefix apps/playground run build
npm --prefix apps/playground run format:check
```

For browser verification, install Playwright Chromium once:

```sh
cd apps/playground
npx playwright install chromium --only-shell
npm test
```

Tests build the app and launch a local production preview server automatically. Screenshots and traces are generated under the ignored `test-results/` directory. If the machine requires system certificate trust for Node, set `NODE_USE_SYSTEM_CA=1` for dependency/browser downloads; do not disable TLS verification.

The frontend follows [ADR-0003](../../docs/architecture/decisions/ADR-0003-capability-first-code-organization.md):

```text
src/
  app/                        # composition, routing and unknown-route recovery
  features/mission/
    ui/                       # catalog and workspace composition
    application/              # mission lookup, checkpoints and fixture coordination
    domain/                   # canonical Mission, MissionPreview and Checkpoint
    data/                     # explicit registry and existing mission fixtures
  features/protocol-flow/
    ui/                       # diagram, layout geometry, timeline and Inspector
    application/              # single actor/event inspection selection
    domain/                   # neutral actors, events, channels and safe evidence
  main.tsx                    # existing Vite entry
  styles.css                  # existing global visual system
```

Mission's public `index.ts` connects to app composition. Protocol-flow exposes `contracts.ts` (types), `selection.ts` (coordination hook) and `index.ts` (UI); internal modules import their own implementations directly. Domain/application code does not import UI barrels. No protocol-flow data layer or shared UI folder is needed by the current application.

`useMissionWorkspace` coordinates checkpoints, fixture loading, replay and reset. It composes `useProtocolSelection`, which owns one active actor/event inspection and its derived highlights. Map scale, scrolling and browser effects stay in UI. `tests/architecture.spec.ts` checks dependency direction, cycles, canonical models and framework-independent domain compilation using the existing test runner and TypeScript compiler. The app still registers only its two static previews. New real execution capabilities require separate approval.

See [verification.md](verification.md) for scope, adaptations and verification evidence.

The subsequent [design foundation verification](../../openspec/changes/mission-control-design-foundation/verification.md) records the directed-interaction refinement and its visual comparison.
