# Proposal

**APPROVED narrowed preparation: 2026-11-14 — no live deployment.**
Existing preparation approval covers tasks 1.1–5.2; tasks 6.1/6.2 still require release approval.

**Final owner decision, 2026-11-16 — experimental public beta:** retain the existing
Keycloak H2 `dev-file` storage and development startup. Remove the earlier Keycloak
PostgreSQL migration, provisioning, role-creation and storage-transition requirements.
Preparation tasks 5.3–5.5 now cover only a focused Keycloak 26.8.0 → 26.8.2 security
upgrade, consistent H2 backup and tested rollback. The earlier preparation apply
authorization remains recorded; this request updates planning only and authorizes no
live-service modification, backup pause, deployment or public OAuth activation.
Tasks 6.1/6.2 still require separate release approval.

The 11 completed tasks, existing OAuth implementation, public SPA/BFF release candidate
and dated evidence remain unchanged. This decision supersedes the storage-transition
instructions and production-storage gate in the dated
[execution report](keycloak-production-verification.md) and [release packet](release-packet.md);
their observations and saved image identities remain historical evidence, not new work.

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
- Retain the existing `epa-lab-keycloak` container/service identity, H2 volume
  `epa-auth-lab_keycloak-data`, ePA realm/users/clients/keys and existing OAuth behavior.
  Prepare only the 26.8.2 provider image change with a consistent protected H2 backup,
  isolated compatibility/restart checks and rollback to the saved 26.8.0 image/state.
- Explicitly label the release experimental beta: owner-provisioned individual demo
  accounts, synthetic-only data, unsupported production storage/startup risk and no
  production-readiness claim. The owner accepts this bounded risk; retaining H2 is not
  an unresolved database decision or a requirement to adopt production startup.

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

There is no Keycloak database provisioning, role creation, export/import transfer or
storage-engine/startup-mode transition in scope. HAPI's PostgreSQL configuration, database,
data, schema, ownership, credentials and permissions remain unchanged. Its recorded
availability issue is a separate operational issue, not a dependency of the Keycloak
backup/upgrade preparation. A failing actual resource path still prevents claiming a
successful end-to-end public resource journey. No new service or application dependency,
general database restructuring or broad readiness review is planned.

Remaining provider preparation is a verified consistent backup, immutable 26.8.2 image,
isolated state-preservation/rollback evidence and refreshed packet. Required backup or
upgrade maintenance and public release need specific approval; none is supplied by this
planning update. The concrete [activation gates](design.md#public-authentication-activation-gates)
retain HTTPS/proxy, private administration/FHIR and discovery/JWKS/token/session checks.
The accepted H2/development-mode risk does not waive those controls or establish
production readiness. The existing public site remains fixture-only until release approval.
