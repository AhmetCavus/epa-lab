# ADR-0002 — Mission-Agnostic Shell, Explicit Mission Capabilities

- **Status:** PROPOSED (principle agreed in discussion; contract still in review)
- **Date:** 2026-10-16

## Context

The user wants a catalog supporting OAuth, ePA and future protocol families without having to rebuild the learning UI. A fully dynamic plugin/runtime platform would add complexity before meaningful user value is verified.

## Proposed decision

Separate **Mission Control Shell** from **Mission Definitions** and **Mission Execution Capabilities**.

- **Shell:** catalog, generic canvas, step selection, timeline, inspector, status and accessibility.
- **Definition:** content/configuration with ID, title, learning objectives, actors, groups, learning steps and mission-specific actions/explanations.
- **Capability:** explicit mission-owned operations and safe telemetry contracts; can use mission-specific backend integrations.
- Register supported missions explicitly at build time initially; no third-party runtime loading.

## Minimal boundary contract (conceptual, not code)

| Area | Common shape | Mission-specific content |
|---|---|---|
| Identity | Stable mission ID + availability | OAuth/OIDC, ePA, etc. |
| Actors | IDs, labels, grouping hints | BFF, AS, IdP, VAU, etc. |
| Learning | Objectives and step references | Human explanations |
| Actions | Label, enablement, action identifier | Backend operation/handler |
| Events | ID, observer, time, status, source, destination | Typed safe details, interpretation |
| Runtime kind | `real` / `simulation` / `concept` | Accurate claim for that mission |

Never make `safeDetails` an unrestricted dump of arbitrary request data. Each mission uses a typed allowlist.

## Boundary acceptance test

UI Slice 001 exercises this boundary with static definitions in `apps/playground`: a fixture-only OAuth preview and a conceptual ePA layout preview. Their shell has no mission-ID branches. This demonstration does not accept the proposed future execution capability or backend event contract.

Render both OAuth and a conceptual ePA fixture in the same Catalog and Workspace **without OAuth-conditional logic or hardcoded protocol-specific labels in the shell**. ePA fixture does not imply ePA protocol execution.

## Alternatives rejected for now

Runtime plugin engine, universal protocol-state-machine DSL, generalized backend protocol broker, game system, and microfrontends.

## Consequences

Future missions may add new protocol-specific server capabilities. Shell reuse does **not** imply every mission shares Keycloak, OAuth, or the same sequence semantics.

## Approval checklist

- [ ] Fixture-driven UX test demonstrates shell reuse.
- [ ] Supported actions/events do not leak protocol secrets.
- [ ] No speculative plugin framework or unnecessary service layers.
