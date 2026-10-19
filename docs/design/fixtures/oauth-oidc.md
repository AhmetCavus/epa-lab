# UX Fixture — OAuth / OIDC

**Status:** DESIGN-ONLY SAMPLE · **Not** an executable mission declaration.

## Goal

Understand an OIDC Authorization Code + PKCE flow and why a protected API accepts an Access Token, not an ID Token.

## Actor map

| Actor | Display group | Concept |
|---|---|---|
| Human user | User | Resource Owner |
| Browser / React SPA | User device | Interface and user agent, **not the OAuth client** |
| NestJS BFF | Our application | OAuth/OIDC **Client**; creates transaction and session |
| Authorization Server role | Keycloak | `/authorize` and `/token`, PKCE challenge/verification |
| Identity Provider role | Keycloak | User authentication |
| Demo Resource Server | Demo backend | Validates Access Token and permission |

## User actions supplied to shell

- Start authentication (initiates browser navigation to BFF `/auth/login`).
- Request synthetic protected document (via BFF after session established).
- Inspect safe event evidence.
- End application session.

## Learning checkpoints (not one-to-one with network requests)

Understand roles → Start authorization → Authenticate at IdP → Understand callback and code exchange → Distinguish tokens → Access protected API → Review evidence and outcome.

## Example observed BFF events

Authorization initiated, callback correlation accepted/rejected, token exchange succeeded/failed, OIDC response validated/rejected, application session established, demo API request allowed/denied, session ended. Provider-internal authentication and PKCE checking can be **explained** but are not automatically observed directly.

## Non-goals of this fixture

No real credentials, raw tokens or code, no ePA behavior, no live OAuth execution implied by this Markdown sample.
