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

| Area         | Common shape                                    | Mission-specific content                                                   |
| ------------ | ----------------------------------------------- | -------------------------------------------------------------------------- |
| Identity     | Stable mission ID + availability                | OAuth/OIDC, ePA, etc.                                                      |
| Actors       | IDs, labels, grouping hints                     | BFF, AS, IdP, VAU, etc.                                                    |
| Learning     | Objectives and step references                  | Human explanations                                                         |
| Actions      | Label, enablement, action identifier            | Backend operation/handler                                                  |
| Events       | ID, observer, time, status, source, destination | Typed safe details, interpretation                                         |
| Runtime kind | `real` / `fixture` / `concept`                  | Accurate claim for that mission; a fixture is not simulated authentication |

Never make `safeDetails` an unrestricted dump of arbitrary request data. Each mission uses a typed allowlist.

For the proposed standard integration, the concrete wire field is `evidence` in a version-1 discriminated event contract; `safeDetails` above describes a boundary principle, not an additional DTO field. Stable event/run IDs, per-run sequence, actual observer/time, closed kind, actor references, channel and outcome accompany per-kind allowlisted evidence. The mission adapter validates that contract and projects it into neutral protocol-flow presentation; the generic shell does not validate OAuth or interpret upstream token claims.

BFF-observed outcomes, explicit HAPI-reported decisions, fixture explanations and unobservable Keycloak internals remain distinct. Unsupported/unsafe data has no raw JSON fallback. BFF-local observed checks have no network arrow; a BFF denial before an upstream call cannot become a HAPI denial. The [system context](../system-context.md#safe-event-provenance) and [OpenSpec design](../../../openspec/changes/001-oidc-pkce/design.md#6-define-a-versioned-safe-observation-contract) define the proposed exact contract and provenance.

Accepted ADR-0003 supplies the actual capability/public-entry/layer rules; this ADR's conceptual shell/definition/capability distinction does not create new code layers or a runtime plugin system. The existing `FixtureEvent` type has no runtime observer contract; adding a neutral observed variant is planned implementation work, not something this review claims already exists. Accepted ADR-0004 keeps translation at presentation boundaries without changing event identity, evidence literals, selection or run state.

Runtime actions remain mission-owned. Replay explanation and Reset view are presentation operations; Retry creates a fresh attempt and local Sign out ends application authentication. Current fixture mode exposes no fake runtime action, session or ePA result.

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

## Readiness review — 2026-11-11

- **Reviewer:** Codex, documentation and repository review for change `001-oidc-pkce`, task 1.3.
- **Review decision:** consistent with the existing capability architecture and proposed neutral runtime projection; recommended for owner acceptance.
- **Owner decision:** PENDING. Status remains PROPOSED; the acceptance checklist above is not signed off by this advisory review.
- **Evidence:** [consolidated readiness review and approval summary](../../../openspec/changes/001-oidc-pkce/readiness-review.md), including safe event provenance, fixture/runtime separation, UX and disclosure checks.

The fixture-only implementation demonstrates the existing boundary without accepting future execution capabilities. No new generic framework, backend implementation, ADR acceptance or deployment permission follows from this review.
