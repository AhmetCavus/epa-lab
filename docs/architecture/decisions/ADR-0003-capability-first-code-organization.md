# ADR-0003: Capability-First Code Organization

- **Status:** Accepted
- **Date:** 2026-10-19
- **Project:** Auth Protocol Playground
- **Scope:** React SPA source organization and module boundaries
- **Related OpenSpec change:** `capability-first-arch-refactoring`

## Context

Auth Protocol Playground is a browser-based learning experience with an extensible Mission Catalog and a reusable Mission Control workspace. The first mission demonstrates OAuth 2.0/OIDC, with ePA and other protocols planned.

The current React application works, but its source organization needs clearer ownership boundaries before further development. In particular, mission selection and mission metadata should remain separate from generic protocol-flow visualization. The application must support new missions without embedding protocol-specific logic in the shared workspace.

We want maintainable code, **not** enterprise DDD scaffolding. This decision is an organizational guideline for the current React application, not a mandate to add abstractions or refactor the NestJS BFF prematurely.

## Decision

### 1. Organize by capability first

Application source is grouped by **what the software does**, not by a global technical layer. Initial capabilities are:

- **`mission`**: mission catalog, registration, metadata, selection and mission-related navigation.
- **`protocol-flow`**: protocol-neutral actors, message/sequence visualization, event selection, timeline and inspector.

Protocol-specific capabilities such as `oauth` or `epa` may be added only when real functionality requires them. Their definitions or adapters must not leak into the generic `protocol-flow` UI.

### 2. Use internal layers only where needed

Within each capability, use these responsibilities as appropriate:

| Layer | Responsibility | Constraints |
| --- | --- | --- |
| `ui/` | React components, visual state and user interactions | No API calls or protocol-specific rules in generic components |
| `application/` | Use-case coordination and meaningful state transitions; React hooks when useful | No business rules hidden inside rendering code |
| `domain/` | Types, invariants and framework-independent domain logic | No React, browser APIs, HTTP clients or persistence imports |
| `data/` | Static registries, fixtures and external adapters | No rendering logic; distinguish fixtures from real observations |

A capability does **not** need all four directories. Do not create empty directories, pass-through services, fake repositories or interfaces merely to match the layout. Do not add a separate `model/` directory: domain models belong in `domain/`, while transport-specific types stay next to their adapter when appropriate.

### 3. Define dependency and ownership boundaries

- `domain/` depends only on language/runtime-independent utilities and narrowly justified shared types.
- `application/` may use its own domain and data implementations directly when introducing dependency-injection ports would add no value.
- `ui/` consumes application functionality and domain contracts; small UI-local state does not require an application hook.
- `data/` may import its capability's domain contracts; the domain must never import `data/`.
- Capabilities expose narrow public entry points where another capability needs to use them. Avoid deep imports into another capability's internal directories and avoid cyclic dependencies.
- The application composition layer (`app/`) connects mission selection with protocol-flow rendering. The generic flow visualization must not import from `mission`, `oauth`, `epa` or Keycloak-specific modules.
- Mission-specific actors, events and explanatory content may be supplied as data, but the renderer operates on protocol-neutral contracts.
- Shared utilities and components belong in `shared/` **only after concrete reuse**; do not create a generic shared framework speculatively.

### 4. Keep the mission extension mechanism simple

Missions are explicitly registered through a typed, static registry for now. A mission can provide metadata, actors, learning steps and demonstrative events through existing domain contracts.

Adding a mission should not require changing generic protocol-flow components. A new mission may still require new protocol-specific backend integrations or adapters. No plugin loader, scripting engine, dynamic extension marketplace or universal workflow engine is required.

### 5. Separate real evidence from educational fixtures

Fixture events are labeled as examples. Generic event visualization may distinguish front-channel, back-channel, provider-internal and non-observable steps, but must not imply that explanatory or simulated events were observed in a real OAuth exchange. These semantics belong in the event model and presentation, not in hardcoded OAuth branches.

## Illustrative frontend layout

The tree describes ownership, **not** a request to scaffold unused files:

```text
apps/playground/src/
├── app/                         # application composition and routing
├── features/
│   ├── mission/
│   │   ├── ui/                  # catalog, mission cards, mission panel
│   │   ├── application/         # selection/coordination, when meaningful
│   │   ├── domain/              # mission definitions and rules
│   │   └── data/                # static registry, mission fixtures
│   └── protocol-flow/
│       ├── ui/                  # canvas, timeline, inspector
│       ├── application/         # event/selection coordination
│       ├── domain/              # actor, event, channel, evidence contracts
│       └── data/                # only if an actual adapter is needed
└── shared/                      # only truly reused UI/utilities
```

File names, hook names and the precise split are determined by the existing codebase; moving files is preferable to rewriting components.

## Consequences

**Benefits**
- Clear ownership of mission selection versus protocol-flow visualization.
- Easier addition of new missions without coupling generic UI to specific protocols.
- More predictable code navigation and smaller, reviewable changes.

**Trade-offs**
- Some relative imports or small public exports are needed between capabilities.
- Layer boundaries are guidelines, not compile-time isolation; enforce them through code review and focused checks before introducing tooling.

## Rejected alternatives

1. **Global `components/`, `models/`, `services/`, `repositories/` tree:** obscures capability ownership as features grow.
2. **Mandatory `ui/controller/domain/data/model` per feature:** overlaps domain/model responsibilities and generates boilerplate.
3. **Full DDD/hexagonal architecture with interfaces for every class:** unjustified for a small React frontend.
4. **Generic mission plugin engine:** premature until a concrete runtime-extension requirement exists.

## Application and verification

This decision is implemented by the OpenSpec change `capability-first-arch-refactoring`.

- Preserve existing mission catalog, workspace, fixtures, sequence diagram, styling, accessibility and behavior.
- Preserve existing domain contracts unless an actual dependency problem requires a minimal adjustment.
- Avoid new runtime dependencies, backend work and UI redesign.
- Verify TypeScript, build, existing automated browser/accessibility tests and OpenSpec validation; record any unavailable checks.
- Inspect imports for cycles, deep cross-capability dependencies and protocol-specific logic inside generic visualization components.

The ADR remains valid independently of small file or directory changes. Revisit it only if a new requirement invalidates its architectural boundaries.
