# ADR-0001 — Browser SPA with NestJS BFF and Keycloak

- **Status:** PROPOSED (architecture agreed in discussion; formal review pending)
- **Date:** 2026-10-16

## Context

The user wants a browser-only learning product. A public JavaScript OAuth client is possible, but makes token exposure and inspection boundaries harder to control. A BFF separates the UI and the confidential OAuth client without introducing a separate login mask.

## Proposed decision

Use React/TypeScript SPA in the browser, NestJS BFF as confidential OAuth/OIDC client, and Keycloak as Authorization Server and Identity Provider for the first mission. The browser starts authentication by navigating to a BFF endpoint; **the BFF redirects to Keycloak's login UX**. The browser receives only a session cookie after successful callback handling; the BFF holds OAuth tokens server-side. The demo Resource Server remains a separate logical security boundary.

## Consequences

- Browser UI remains framework-driven and educational; no desktop/mobile application.
- No custom password form in SPA or BFF.
- Keycloak AS and IdP roles can be visualized separately while grouped as one deployment.
- External redirects are real navigation; UI cannot step-debug provider internals.
- BFF-to-provider token exchange and BFF-to-resource authorization are server-side operations.

## Alternative not selected for first mission

Pure SPA public OAuth client with browser-side token processing. May be interesting as a future **comparison** mission, but is not the baseline architecture.

## Approval checklist

- [ ] Browser redirect and login responsibility verified in the sequence.
- [ ] Cookie/session/CSRF/security obligations accepted.
- [ ] Decision integrated into mission UX and OpenSpec scenarios.
