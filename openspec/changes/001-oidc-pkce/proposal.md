# Change 001 — First Runnable Mission (OAuth / OIDC + PKCE)

**Status:** DRAFT — NOT IMPLEMENTATION-AUTHORIZED

**UI Slice 001 exception:** The owner has authorized the Catalog and mission-agnostic Workspace using clearly labeled fixture events (`AGENTS.md`, owner request: “Start with slice 001”). Only the UI checklist in `tasks.md` is authorized. The OAuth/backend proposal below remains DRAFT. The UI lives in the isolated `apps/playground` package alongside the existing repository; it does not integrate with its services.

## Problem

A basic Keycloak login demonstration alone will not demonstrate protocol understanding or a reusable learning experience. The first slice must deliver the **Mission Catalog + Mission Control Workspace** and a real, secure, inspectable Authorization Code + PKCE journey.

## Proposed scope

- Show a mission catalog with honest availability and a planned ePA card.
- Open the generic workspace using a selected mission definition.
- Explain user, browser, BFF Client, Keycloak AS, Keycloak IdP, demo Resource Server as distinct logical actors.
- Start a real OIDC Authorization Code + PKCE S256 flow through Keycloak.
- Establish a secure BFF-managed user session only after valid callback/token handling.
- Inspect per-run sanitized BFF / Resource Server observations, separate from teaching explanations.
- Request one synthetic resource through the BFF, with Resource Server authorization.
- End application session and inspect the denied request outcome afterward.
- Validate UI reuse with a design-only ePA fixture (not ePA runtime).

## Out of scope

PAR, real ePA/TI integration, user registration, AI tutor, token revelation, raw packet capture, runtime mission plugins, public deployment hardening, badge/score infrastructure.

## Proof of value

A developer can complete the mission from Catalog to finished run, explain the actor/channel boundaries and why the protected API accepted or denied access, and inspect safe evidence rather than trusting a scripted animation.

## Dependencies / blockers

- Approve catalog and workspace UX / high-fidelity design.
- Accept ADR-0001, ADR-0002 and resolve hosting boundary.
- Approve detailed scenarios in `specs/` and the technical design.

## Review status

**Only UI Slice 001 code is authorized.** Real authentication, backend, protected APIs, Keycloak and infrastructure remain outside that authorization.
