# Proposal

**APPROVED narrowed preparation: 2026-11-14 — no live deployment.**
Existing preparation approval covers tasks 1.1–5.2; tasks 6.1/6.2 still require release approval.

**Final owner architecture decision, 2026-11-16:** use patched Keycloak 26.8.2 in
production mode with a fresh `keycloak` database and dedicated least-privilege
`keycloak_app` role on the existing PostgreSQL 16 instance. Reuse the existing
`epa-lab-keycloak` service. Provision both realms and fresh synthetic users from versioned
configuration; do not import or migrate any existing H2 data. Retain the original H2
volume offline for recovery until the fresh installation is accepted.

**Planning only.** This update authorizes no PostgreSQL repair, DDL, live database reset,
container replacement or public activation. Earlier preparation authorization is history,
not approval to execute the revised live operations. Tasks 6.1/6.2 still require separate
release approval; the remaining preparation must follow its specific operational gates.

The 11 completed tasks, existing OAuth implementation, public SPA/BFF release candidate
and dated evidence remain unchanged. This decision supersedes the retained-H2 beta plan
and all legacy-data migration procedures in the dated
[execution report](keycloak-production-verification.md) and [release packet](release-packet.md);
their observations and saved image identities remain historical evidence. Only the five
unfinished implementation tasks are revised; completed descriptions remain verbatim.

## Why

The owner confirms that the public site at `https://auth-playground.yappai.de` and the private
OAuth mission at `http://192.168.178.131:5173` work. Connect the existing production SPA to
that implemented mission through the current infrastructure.

The earlier isolated Cloudflare 403 is a probe result, not evidence of an infrastructure
outage. Historical [verification](repository-verification.md) remains unchanged. This scope
supersedes its HAPI privilege and broad readiness prerequisites, including earlier
preparation guidance. The only new database work is a fresh, isolated Keycloak database;
the completed task 1.1 remains an approval-history record.

## What Changes

- **BREAKING public behavior:** add an explicit production OAuth build of the existing React
  SPA served by Nginx. Keep the fixture build as the rollback release; use no public Vite server.
- Proxy the declared `/api/oauth` operations on the SPA origin to the existing NestJS BFF.
- Configure the public HTTPS origin, fixed callback, standard-profile issuer and secure cookies.
  Reuse Code + PKCE S256, sessions, resource access and observed-event contracts.
- Make only the required demo-realm Keycloak login/OIDC paths reachable over HTTPS through
  the existing route. Preserve private ePA endpoint/issuer contracts and mandatory PAR;
  verify them against the fresh configuration rather than promising old identity continuity.
- Prepare targeted replacement of the public SPA plus only necessary reviewed service settings.
  Reuse Cloudflare Tunnel, Traefik, Nginx, BFF, Keycloak and private HAPI unchanged in purpose.
- Verify the real browser journey, new ingress security boundaries and targeted rollback.
  Keep synthetic-only access and owner-provisioned individual demo accounts.
- Reuse PostgreSQL 16, adding only fresh database `keycloak` and least-privilege role
  `keycloak_app`. Keep HAPI's database, data, credentials, ownership and permissions intact.
  Diagnose and restore the existing PostgreSQL service's availability before provisioning.
- **BREAKING identity continuity:** initialize `epa-demo` and `playground-public` from
  versioned configuration with fresh synthetic users and generated signing keys. Confirm
  the consequences for old users, credentials, sessions, tokens and client bindings before
  live replacement. Do not transfer H2 records, credentials, keys or sessions.
- Prepare production-mode Keycloak 26.8.2 and targeted acceptance/recovery using the existing
  service. Keep `epa-auth-lab_keycloak-data` offline with its saved original image/settings;
  no H2 upgrade, export/import migration or legacy-data migration rehearsal is required.
- Keep experimental-beta labeling, owner-provisioned individual demo accounts, synthetic-only
  data and no production-readiness claim. Production startup/storage alone proves no release.

## Capabilities

### New Capabilities

- `public-playground-runtime`: public execution of the existing OAuth mission with secure
  same-origin routing, fresh ePA/PAR compatibility, acceptance and targeted recovery.

### Modified Capabilities

None in the current main-spec inventory. Change 001's OAuth/security/UX contracts remain
the baseline; only a separately approved release replaces its public fixture-only binding.

## Impact

Limited to SPA build/runtime configuration, its Nginx proxy, BFF public profile/cookie/proxy
settings, versioned realm provisioning, fresh Keycloak database/role and production startup,
necessary HAPI issuer/JWKS settings and the targeted release packet. Existing design, DE/EN
localization, accessibility and application logic stay. Preserve the existing SPA/BFF
candidate identities, subject to focused verification against the new provider.

PostgreSQL availability is now a concrete prerequisite because Keycloak will share that
existing instance. Recovery must preserve the HAPI database/data and existing PostgreSQL
configuration; no reset, reinitialization, HAPI privilege change or shared-volume replacement
is a proposed remedy. No extra PostgreSQL instance, generic migration tooling or broad
readiness review is planned.

The remaining [gates](design.md#public-authentication-activation-gates) are targeted PostgreSQL
recovery/provisioning, confirmed identity-reset consequences, verified fresh ePA/PAR/OAuth
behavior, offline H2 recovery retention and separately approved live release/public acceptance.
No H2 export/import, H2-to-PostgreSQL transfer or legacy-data migration rehearsal belongs
to this plan. The current public deployment remains fixture-only until separate approval.
