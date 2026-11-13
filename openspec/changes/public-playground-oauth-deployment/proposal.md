# Proposal

**Status: DRAFT — planning only, not approved for implementation or deployment.**
Date: 2026-11-13. Depends on the implemented, unarchived `001-oidc-pkce` baseline.

## Why

The public Playground still serves fixtures although its real OAuth mission works privately.
Publishing that mission requires an explicit production build, a safe public login boundary
and reproducible deployment controls; enabling the private Vite binding is insufficient.

## What Changes

- **BREAKING public behavior:** replace the hosted fixture-only release with an explicitly
  enabled, production-built OAuth mission at `https://auth-playground.yappai.de`. Preserve
  the fixture build and conceptual ePA preview as deliberate modes and rollback artifacts.
- Reuse the existing Nginx, BFF, Keycloak, HAPI, Cloudflare Tunnel and Traefik. Route
  `/api/oauth` on the SPA origin; expose only the public demo realm's required Keycloak
  login/OIDC paths and assets. Keep legacy ePA routes, administration and FHIR private.
- Propose a dedicated `playground-public` realm in the existing Keycloak instance and a
  separately configured standard-profile issuer. Preserve the existing `epa-demo` issuer,
  users, client credentials and mandatory PAR policy, subject to independent compatibility
  verification before cutover.
- Make Keycloak production startup and tested migration from its observed embedded
  development database prerequisites. Use a dedicated Keycloak PostgreSQL container and
  volume for provider-data isolation, as selected by the owner on 2026-11-13. This confirms
  the proposal's database arrangement, not implementation or deployment authorization.
- Use **owner-provisioned individual demo accounts, with no public registration**, as
  confirmed by the owner. Only the fixed fictional `Basic/playground-demo` is accessible.
- Add public HTTPS/proxy validation, secure cookies, exact-Origin/CSRF enforcement, bounded
  abuse controls, safe logging and monitoring. Preserve existing protocol/event contracts.
- Resolve the verified HAPI configuration drift in the canonical host/Yoster lifecycle;
  prove public acceptance, ePA regressions, restart recovery and targeted rollback.

## Capabilities

### New Capabilities

- `public-playground-runtime`: controlled public execution of the existing synthetic OAuth
  mission, including ingress, demo access, compatibility, production operations and rollback.

### Modified Capabilities

None in the current main-spec inventory (`openspec list --specs` is empty). The authorization
and mission contracts remain in change 001's deltas. This proposal explicitly supersedes
their public-fixture-only deployment restriction **only for the subsequently approved public
release**; it preserves their security/UX behavior and historical verification records.

## Impact

`apps/playground` build/configuration/localized runtime status; existing auth-client
configuration and public request guards; Keycloak setup/migration; canonical host Compose
and `yappai.host.json`; project-scoped Nginx/Traefik/Tunnel policy and operational runbooks.
The watched Traefik file is outside this repository at
`/srv/yappai/hosting/infra/traefik/dynamic/epa-lab.yml` and needs a reviewed, reproducible source.
HAPI needs deployment configuration rather than a new authorization implementation.

No second BFF/Resource Server, public Vite, new protocol framework, real patient data,
self-service identity system, public ePA execution or unrelated dependency upgrade is planned.
Existing databases/volumes and other hosted projects must survive. Migration maintenance
and reauthentication are explicit release considerations, not claims of session continuity.
