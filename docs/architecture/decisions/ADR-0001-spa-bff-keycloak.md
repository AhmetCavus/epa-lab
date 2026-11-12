# ADR-0001 — Browser SPA with NestJS BFF and Keycloak

- **Status:** Accepted
- **Date:** 2026-10-16
- **Accepted:** 2026-11-11 by the project owner for change `001-oidc-pkce` (local/private implementation)

## Context

The user wants a browser-only learning product. A public JavaScript OAuth client is possible, but makes token exposure and inspection boundaries harder to control. A BFF separates the UI and the confidential OAuth client without introducing a separate login mask.

## Decision

Use React/TypeScript SPA in the browser, NestJS BFF as confidential OAuth/OIDC client, and Keycloak as Authorization Server and Identity Provider for the first mission. The browser starts authentication by navigating to a BFF endpoint; **the BFF redirects to Keycloak's login UX**. The browser receives only a session cookie after successful callback handling; the BFF holds OAuth tokens server-side. The demo Resource Server remains a separate logical security boundary.

## Existing-component and security alignment

The proposed integration reuses React Mission Control in `apps/playground`, the existing NestJS OAuth client in `services/auth-client` as the BFF, the existing Keycloak deployment in `infrastructure/keycloak`, and HAPI FHIR in `services/res-server`. HAPI is the independent Resource Server; its required inbound security is not implemented or verified by the current client login.

The standard mission uses a separate confidential Keycloak client and direct Authorization Code + PKCE S256 without PAR. The existing ePA client, required-PAR policy, header smoke operation and browser demonstration remain unchanged. Mission Control's ePA preview remains conceptual.

The proposed standard browser API is `/api/oauth`, with login/callback/session/logout/resource/owned-run routes and clean 303 callback return to `/missions/oauth-oidc/workspace`. Legacy ePA `/login`, `/callback` and `/session` stay separate. See [system-context.md](../system-context.md) for exact methods, routes and trust boundaries.

Standard session credentials remain server-side; cookies are isolated from ePA, HttpOnly, SameSite=Lax and Secure under HTTPS. POST logout requires configured Origin plus context-bound anti-CSRF checks. Logout cancels context-bound pending/in-flight attempts as well as invalidating authentication. After asynchronous exchange/validation, the original context/attempt must still be eligible immediately before session commit. Cleanup cannot depend on event persistence, and retained safe viewing history grants no resource permission.

The owner has authorized local/private implementation under change `001-oidc-pkce`. The existing public static site remains fixture-only. This alignment adds no second BFF, authentication UI, persistent session infrastructure or public authentication deployment.

## Consequences

- Browser UI remains framework-driven and educational; no desktop/mobile application.
- No custom password form in SPA or BFF.
- Keycloak AS and IdP roles can be visualized separately while grouped as one deployment.
- External redirects are real navigation; UI cannot step-debug provider internals.
- BFF-to-provider token exchange and BFF-to-resource authorization are server-side operations.

## Alternative not selected for first mission

Pure SPA public OAuth client with browser-side token processing. May be interesting as a future **comparison** mission, but is not the baseline architecture.

## Approval checklist

- [x] Browser redirect and login responsibility verified in the sequence.
- [x] Cookie/session/CSRF/security obligations accepted.
- [x] Decision integrated into mission UX and OpenSpec scenarios.

## Readiness review — 2026-11-11

- **Reviewer:** Codex, documentation and repository review for change `001-oidc-pkce`, task 1.3.
- **Review decision:** consistent with the proposed integration and existing implementation boundaries; recommended for owner acceptance.
- **Owner decision at advisory review:** Pending at that stage; the owner's subsequent formal acceptance is recorded below.
- **Evidence:** [consolidated readiness review and approval summary](../../../openspec/changes/001-oidc-pkce/readiness-review.md), including cookie/CSRF, resource authorization, cancellation races, event failure and negative acceptance checks.

Accepted ADR-0003 and ADR-0004 remain authoritative for frontend organization and localization. The advisory review alone did not authorize implementation; the owner's subsequent explicit approval satisfies change task 1.4.

## Owner acceptance — 2026-11-11

The project owner explicitly accepted this ADR, the reconciled UX/visual baseline, security architecture and revised specifications, and approved `001-oidc-pkce` for local/private implementation of tasks 2–9. The approval checklist records design/readiness acceptance, not verification of future runtime behavior. The [consolidated owner approval record](../../../openspec/changes/001-oidc-pkce/readiness-review.md#consolidated-owner-approval-summary) is the decision source.

This step records the decision only and starts no implementation. Real authentication must not be deployed publicly; the existing public Playground remains fixture-only.
