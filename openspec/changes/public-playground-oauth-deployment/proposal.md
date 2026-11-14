# Proposal

**APPROVED narrowed preparation: 2026-11-14 — no live deployment.**
Existing preparation approval covers tasks 1.1–5.2; tasks 6.1/6.2 still require release approval.

## Why

The owner confirms that the public site at `https://auth-playground.yappai.de` and the private
OAuth mission at `http://192.168.178.131:5173` work. Connect the existing production SPA to
that implemented mission through the current infrastructure.

The earlier isolated Cloudflare 403 is a probe result, not evidence of an infrastructure
outage. Historical [verification](repository-verification.md) remains unchanged. This scope
supersedes its database, HAPI privilege and broad readiness prerequisites, including earlier
preparation guidance; the completed task 1.1 remains an approval-history record.

## What Changes

- **BREAKING public behavior:** add an explicit production OAuth build of the existing React
  SPA served by Nginx. Keep the fixture build as the rollback release; use no public Vite server.
- Proxy the declared `/api/oauth` operations on the SPA origin to the existing NestJS BFF.
- Configure the public HTTPS origin, fixed callback, standard-profile issuer and secure cookies.
  Reuse Code + PKCE S256, sessions, resource access and observed-event contracts.
- Make only the required demo-realm Keycloak login/OIDC paths reachable over HTTPS through
  the existing route. Preserve the private ePA issuer, users, signing keys, clients and PAR.
- Prepare targeted replacement of the public SPA plus only necessary reviewed service settings.
  Reuse Cloudflare Tunnel, Traefik, Nginx, BFF, Keycloak and private HAPI unchanged in purpose.
- Verify the real browser journey, new ingress security boundaries and targeted rollback.
  Keep synthetic-only access and owner-provisioned individual demo accounts.

## Capabilities

### New Capabilities

- `public-playground-runtime`: public execution of the existing OAuth mission with secure
  same-origin routing, legacy compatibility, acceptance and rollback.

### Modified Capabilities

None in the current main-spec inventory. Change 001's OAuth/security/UX contracts remain
the baseline; only a separately approved release replaces its public fixture-only binding.

## Impact

Limited to SPA build/runtime configuration, its Nginx proxy, BFF public profile/cookie/proxy
settings, demo-realm HTTPS configuration, necessary HAPI issuer/JWKS settings and the targeted
release packet. Existing design, DE/EN localization, accessibility and application logic stay.

PostgreSQL architecture, database/role/ownership/credential migrations, legacy data transfer,
generic migration tooling, fleet restructuring and repeated broad readiness reviews are out
of scope. Existing data and volumes are preserved. No new service or dependency is planned.

Genuine public-authentication blockers are listed separately in [design.md](design.md):
provider production suitability, trustworthy HTTPS/proxy handling, private administration/FHIR,
and actual discovery/JWKS/token/session security. Resolve those gates without bypasses; any
necessary out-of-scope provider/storage work needs its own reviewed authorization, not automatic
inclusion here. SPA/proxy implementation and isolated tests can proceed before activation.
