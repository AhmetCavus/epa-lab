# Proposal

**Status: DRAFT revision — planning only; no live changes or public deployment.**
Date: 2026-11-13. Depends on the implemented, unarchived `001-oidc-pkce` baseline.

The earlier preparation approval is limited to tasks 1.1–5.2. Tasks 6.1/6.2 and live database
ownership/credential changes require separate authorization. This revision performs no implementation.

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
  separately configured standard-profile issuer. Provision this realm, its keys/client secret
  and new individual synthetic demo accounts from scratch; do not copy existing demo users
  or private-realm data into it. Preserve the existing `epa-demo` issuer, users, signing keys,
  clients and mandatory PAR policy through independently verified legacy compatibility.
- Reuse the existing PostgreSQL 16 container/volume and existing `hapi` database/data, with
  separate database `keycloak` and non-superuser runtime accounts `hapi_app`/`keycloak_app`.
  Retain bootstrap administrator `hapi` (confirmed OID 10) for administration/recovery only;
  remove its credential from application use. No second PostgreSQL container, new production
  database volume or public database port is planned.
- Treat `hapi_app` as a targeted in-place privilege/credential transition: reviewed application
  ownership/grant changes, no HAPI data transfer, replacement database or data transformation.
  Rehearse permissions using an isolated synthetic schema; retain ordinary backup/recovery tests.
- Review Keycloak's dev-file storage separately. Use a one-time, pinned-version offline CLI
  export/import of legacy provider state into PostgreSQL, with a consistent stopped-state
  backup, exact ePA key/user/client/policy checks and rollback. Production storage is a
  prerequisite, but public-realm creation does not require migrating existing demo-user data.
- Define idempotent provisioning, independent verified logical backups/restores, bounded
  connection/capacity budgets and shared-instance failure/rollback procedures. Preserve
  HAPI data and logical schema, the existing volume and administrative recovery. Resolve B1
  in the plan through separate runtime secrets, narrowly inventoried application-object
  ownership/grant changes and verified cross-database denial. Use existing PostgreSQL and
  Keycloak tools with short project-specific procedures and change records; add no generic
  migration framework, resumable migration engine or unrelated schema/data conversions.
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
configuration and public request guards; fresh public-realm setup and legacy Keycloak storage
transition; canonical host Compose
and `yappai.host.json`; project-scoped Nginx/Traefik/Tunnel policy and operational runbooks.
The watched Traefik file is outside this repository at
`/srv/yappai/hosting/infra/traefik/dynamic/epa-lab.yml` and needs a reviewed, reproducible source.
HAPI needs deployment configuration rather than a new authorization implementation.
Keycloak will connect privately to `res-server-db:5432/keycloak`; HAPI continues using
`res-server-db:5432/hapi`. Existing database bootstrap identity/password and the shared volume
remain. Planned host/environment/operations updates separate HAPI's runtime credential from
`RES_SERVER_DB_PASSWORD`, preserve bootstrap ownership of databases/system objects, and give
each application only its own schema/runtime privileges.

No second BFF/Resource Server, public Vite, new protocol/migration framework, real patient data,
self-service identity system, public ePA execution or unrelated dependency upgrade is planned.
Existing databases/volumes and other hosted projects must survive. Legacy provider maintenance
and reauthentication are explicit release considerations, not claims of session continuity.
