# Auth Protocol Playground — Project Constitution

**Status:** DRAFT · **Date:** 2026-10-16

**Owner-authorized exception:** UI Slice 001 may implement the fixture-only Catalog and mission-agnostic Workspace in isolated `apps/playground`, as recorded in `AGENTS.md` and the change's UI checklist. All OAuth/backend implementation and architecture approvals remain DRAFT. This exception takes precedence over the general design-only gate for this slice.

**Owner-authorized static deployment (2026-10-19):** Publish the existing fixture-only `apps/playground` at `auth-playground.yappai.de` and register it as a Yoster hosted project. This authorizes the dedicated static Nginx/Compose stack, Traefik routing and hosting metadata only. The deployment must serve the existing catalog and direct workspace routes, report container/HTTP health, and remain independent of the existing authorization/Keycloak stack. All real authentication and backend gates remain in force.

## Purpose

A browser-based, developer-oriented Mission Control to teach authentication and authorization protocols through runnable, safely observable missions and explanatory visualizations.

## Binding project constraints agreed in discussion

1. **Browser only.** React + TypeScript SPA, not native mobile/desktop.
2. **Initial auth model.** NestJS BFF is the OAuth/OIDC Client; Keycloak supplies Authorization Server and Identity Provider roles; the browser displays Keycloak's login form.
3. **Mission-first product.** Catalog and mission-agnostic workspace, not an OAuth-only shell.
4. **Design before code.** Product + UX + visuals + architecture + acceptance must be approved before implementation.
5. **Safe observation.** Never expose raw OAuth tokens, secret material or unredacted request/response bodies; do not assert provider-internal activities were directly observed.
6. **No premature framework.** Capability-first vertical slices, simple explicit mission registration, no plugin engine or speculative microservices.
7. **Honest claims.** ePA/gematik is planned and conceptual until separately specified and verified; no compliance/certification claims.

## Artifact authority

- `docs/product/`: purpose and scope.
- `docs/design/`: user journey, high-fidelity visual direction and states.
- `docs/architecture/`: roles, trust boundaries, ADRs.
- `openspec/changes/`: approved feature changes, observable acceptance scenarios and work checklist.

Documents must not silently contradict each other. Status cycle: `DRAFT → REVIEWED → APPROVED → IMPLEMENTED → VERIFIED`. Only `APPROVED` changes authorize coding.

## Scope for first runnable vertical slice (candidate Change 001)

Mission Catalog → OAuth/OIDC Workspace → Keycloak login through BFF → safe callback/session → inspect observed timeline → authorize synthetic protected API resource → logout. Designed as a generic shell with an ePA UX fixture used to demonstrate extensibility.

## Next changes (not approved)

- PAR comparison.
- Synthetic isolated negative/security experiments.
- More missions including ePA with appropriate gematik specs and honest simulation/live boundaries.

## Non-goals

Custom authorization server, shared token debugging console, raw packet sniffer, user password screen, mobile/desktop distribution, real patient data, production multitenancy, AI tutor, generic game engine, external plugins.
