# Design

**Live release approved, 2026-11-16; attempt stopped and recovered.** The owner approved
reviewed tasks 6.1/6.2, bounded Keycloak maintenance, public beta activation and targeted
failure recovery. The private acceptance helper rejected an incorrectly supplied private
origin before protocol acceptance; the original private provider and public fixtures were
recovered under the owner's stop-on-failure instruction. Public activation was never
attempted. Tasks remain **14/16 complete**, with 6.1/6.2 approved but unchecked. See
[live execution and preserved state](live-release-verification.md). The dated preparation-only approval
statements below are history, superseded by this explicit release grant and execution record.

**APPROVED narrowed preparation: 2026-11-14 — public deployment is not authorized.**
See [proposal.md](proposal.md) for scope and [tasks.md](tasks.md) for preserved tracking.

**Final owner architecture decision, 2026-11-16:** provision fresh Keycloak state in a
separate `keycloak` database on the existing PostgreSQL 16 instance, with least-privilege
`keycloak_app`, patched 26.8.2 and production startup. Reuse `epa-lab-keycloak`; initialize
both realms and fresh synthetic accounts from versioned configuration. No H2 migration.
Keep the original H2 volume offline for recovery until the new installation is accepted.

**Preparation resumed, 2026-11-16:** the owner explicitly authorized 5.3–5.5 and accepted
recreated users, regenerated keys, invalidated sessions and incompatible old tokens and
credentials, without H2 migration. Live PostgreSQL changes/DDL need separate approval;
live Keycloak replacement and public activation remain excluded. Tasks 6.1/6.2 are still
unapproved. The 11 completed descriptions, existing OAuth code and public SPA/BFF candidate
identities remain unchanged. See [current preparation](fresh-keycloak-preparation.md).

The retained-H2 beta decision and legacy-data migration procedures in the dated
[execution evidence](keycloak-production-verification.md) and [release packet](release-packet.md)
are superseded by decision 7 below. Retain their actual observations and saved artifacts;
task 5.5 refreshes the executable packet after fresh-install verification, not migration tests.

## Context

The owner confirms the public site and private OAuth integration work. The repository
already has the React mission adapter, NestJS OAuth lifecycle/events, Keycloak and secured
HAPI. Preparation tasks 1.1–5.2 now have verified production SPA/Nginx and backend candidates;
default builds and the deployed public site remain fixture-only. The existing Keycloak
runs `start-dev --import-realm` with `KC_DB=dev-file`. The owner now chooses a fresh
production-mode PostgreSQL installation rather than carrying that state forward. The
recorded PostgreSQL availability failure must be resolved before the shared instance can
host the fresh Keycloak database. The [current evidence](fresh-keycloak-preparation.md#approved-targeted-recovery-completed)
records the owner-approved single-container restart and successful private TCP/SQL/HAPI
postchecks. The owner then approved the fresh database/role/schema creation. Those objects
and isolated production-mode protocol/browser/restart verification now pass; the original
live provider remains unchanged. See the [sanitized results](fresh-keycloak-results.json).

The historical [preflight report](repository-verification.md) is retained. Its isolated
Cloudflare 403 does not establish an infrastructure outage or override owner-confirmed
availability. Test the actual OAuth paths when implemented; a reproducible discovery/JWKS
failure from the BFF/HAPI can block authentication without implying the static site is down.
This revision supersedes earlier database/privilege and broad readiness prerequisites.

## Goals / Non-Goals

Publish the implemented mission through existing Cloudflare Tunnel → Traefik → Nginx,
with the existing BFF, Keycloak and private HAPI. Follow ADR-0001 through ADR-0004; preserve
Mission Control visuals, DE/EN behavior, accessibility and truthful observations.

Reuse `epa-lab-keycloak`, existing PostgreSQL 16, OAuth implementation, prepared SPA/BFF
candidates and fixture rollback. Add only a fresh Keycloak database/role and production
provider configuration. Preserve HAPI's database/data/settings/privileges. Keep ePA/PAR
endpoint, issuer and policy contracts, but explicitly regenerate its users and signing
keys from fresh configuration. Retain the original H2 installation offline for recovery;
exclude H2 export/import, data transfer and legacy-data migration rehearsals, new PostgreSQL
instances, generic migration tooling, fleet restructuring and broad readiness reviews.

## Decisions

### 1. Explicit production SPA target

Extend the existing build/runtime binding with an explicit production OAuth opt-in and
exact public-origin check. Reuse the mission API adapter and renderer; browser requests
remain same-origin and cookie-based. Keep the default fixture target and private development
mode. Add a production Nginx target, proposed `public-runtime`; no public Vite/HMR and no
browser-selected issuer, credentials or destination. Browser bundles contain no secrets.

### 2. Same-origin Nginx routing

Keep the working hostname, Tunnel and Traefik service. Add only the necessary project-scoped
routing/trust settings; do not rebuild shared ingress. Nginx uses the existing backend
bridge for BFF/Keycloak connectivity while retaining `dev-proxy` for Traefik; no new network.

| Method | BFF path                                                             |
| ------ | -------------------------------------------------------------------- |
| GET    | `/api/oauth/login`                                                   |
| GET    | `/api/oauth/callback`                                                |
| GET    | `/api/oauth/session`                                                 |
| GET    | `/api/oauth/resource`                                                |
| POST   | `/api/oauth/logout`                                                  |
| GET    | `/api/oauth/runs/:runId/events` with the existing validated ID shape |

Preserve redirect/status/cookie semantics; do not follow OAuth redirects inside the proxy.
Unknown API paths/methods fail closed without SPA fallback. Proxy only the required public
realm's OIDC/login-actions/assets to Keycloak. Deny administrative/management paths, other
realms, legacy ePA endpoints and FHIR forwarding. Normal SPA navigation keeps its fallback.

### 3. Public HTTPS profile and legacy compatibility

Use these fixed bindings; credentials remain server-side:

| Setting            | Public candidate                                             |
| ------------------ | ------------------------------------------------------------ |
| Application origin | `https://auth-playground.yappai.de`                          |
| Standard callback  | `https://auth-playground.yappai.de/api/oauth/callback`       |
| Workspace return   | `/missions/oauth-oidc/workspace`, clean HTTP 303             |
| Standard issuer    | `https://auth-playground.yappai.de/realms/playground-public` |
| Standard client    | Confidential `playground-oidc`, Code + PKCE S256, no PAR     |
| Resource grant     | Audience `playground-fhir`, permission `demo.fhir.read`      |

Provision `epa-demo` from versioned `infrastructure/keycloak/epa-demo-realm.json` and its
existing client definitions, and `playground-public` from versioned
`infrastructure/keycloak/public-realm.mjs` and the existing public-account tooling. These
are declarative fresh-install inputs, not exports from the existing H2 provider. Supply
credentials through protected server-side inputs, generate fresh keys and synthetic users,
keep public registration disabled and public Access Tokens at most five minutes. Repeated
setup verifies owned state and rejects conflicts; it never resets credentials or overwrites
an unrelated realm. Keep the public and legacy ePA client/profile boundaries distinct.

Add standard-only `PLAYGROUND_OIDC_ISSUER` with legacy fallback. Bind origin/callback/issuer
and cookies to the server-selected profile; retain transaction/token validation. Preserve
legacy `OIDC_*` endpoint/issuer contracts and mandatory PAR; match configured client secrets
to the fresh clients. Old users, signing keys, credentials and sessions are not preserved
in the fresh database. Use the public realm's frontend URL rather than silently changing
the global legacy hostname; prove fresh production-mode dual-realm behavior. Keycloak documents explicit hostname/proxy
configuration and realm frontend URLs. [Hostname guidance](https://www.keycloak.org/server/hostname)

The BFF currently has one standard profile. At approved cutover its standard origin moves
from the private binding to the public binding; do not claim both callback configurations
work simultaneously or add a multi-runtime framework. Keep private execution until cutover
and preserve ePA independently. Document the private-standard recovery settings.

### 4. Reuse public-authentication security controls

Use host-only Secure/HttpOnly/SameSite=Lax cookies and exact logout Origin/context-CSRF
checks. Retain browser/run ownership, one-time state, PKCE, expiry and logout cancellation.
Trust only verified proxy peers and the existing Tunnel source; require the trusted edge HTTPS scheme (CF-Visitor), then overwrite forwarding/host/proto headers at the boundary
and reject direct/spoofed access to new authentication routes. Do not infer a client IP
from untrusted Cloudflare/forwarded headers. Keep provider assets/metadata in separately bounded read budgets so they cannot exhaust the BFF session/event budget. Every protected location retains the aggregate cap. Apply a project-scoped guard only where the
existing chain needs it; no global proxy-trust loosening or blanket firewall rewrite.

Use Nginx limits with initial per-client budgets: login 6/minute burst 2, resource 30/minute
burst 5, reads 120/minute burst 20, and independent logout 60/minute burst 10. Bound provider
login actions, aggregate traffic and in-flight work separately; verify safe 429 recovery and
record all final tested values in the packet. No limiter service. Authentication/session/events
bypass shared caches. New credential
routes must exclude raw URLs/queries, cookies, bodies and secrets from routine/error logs;
retain safe status/duration/correlation diagnostics and test upstream-failure paths.

### 5. Keep HAPI private and preserve the implemented mission

Reuse the fixed private `Basic/playground-demo` read, existing token validation and default-deny
FHIR policy. Change only the HAPI issuer/JWKS binding needed for the public standard issuer;
require HTTPS metadata/keys and preserve same-origin validation. Do not change database
credentials/ownership, dependencies, implementation, data, resource policy or seeding behavior.
Verify the real BFF/HAPI path, 200/401/403 and denied external access. Observations retain
schema 1, actual BFF observer/time and explicit HAPI reports; no invented Keycloak internals.

The recorded PostgreSQL availability failure is now a prerequisite for Keycloak because
the fresh database will use that same instance. Task 5.3 covers a focused diagnosis and
separately approved availability recovery, preserving HAPI's database and data. Do not
change HAPI's PostgreSQL configuration, ownership or permissions. Verify recovered service
and private SQL connectivity, then the real resource path; a health label alone is not
availability evidence. No reset, shared-volume replacement or broad HAPI rework is implied.

### 6. Targeted release and rollback

Build/test privately first. The release packet contains exact SPA/BFF image identities,
necessary settings/realm/proxy diffs, affected service names, acceptance results and exact
apply/rollback commands. Preserve the current fixture image and only the configuration
values being replaced. No full-stack `compose down`, volume reset or HAPI database rollback;
provider recovery is limited to the separately reviewed procedure below.

After separate release approval, replace the public SPA with the production target and
apply only reviewed, necessary BFF/Keycloak/HAPI binding changes. Keep unrelated services,
Tunnel routing, databases and data intact. Verify the actual public browser journey before
claiming OAuth is available; staged/private success is supporting evidence, not public acceptance.
The fresh provider must first pass private ePA/PAR and OAuth acceptance. The owner's
identity-reset acceptance is recorded; actual replacement still needs separate approval.

On failure restore the saved fixture image/project routing and previous standard/HAPI trust
settings as needed, invalidate affected BFF sessions and withdraw new OAuth/provider forwarding.
Keep HAPI data intact; disable rather than delete owned public configuration. Restore the saved fixture image with the reviewed withdrawal configuration: close OAuth/provider forwarding and suppress raw URL/error logs, including late callbacks. Verify
fixture navigation and private ePA/PAR after rollback. Ordinary SPA withdrawal requires
no provider-data restore. Provider recovery selects either the accepted fresh PostgreSQL
installation or the retained original private H2 installation as described below; it never
copies state between them or restores the shared PostgreSQL volume.

### 7. Fresh PostgreSQL Keycloak installation, no H2 migration

**Availability first.** Diagnose the recorded missing PostgreSQL container task/refused TCP
path without assuming corruption. Prepare a targeted recovery operation and obtain its
specific approval before any live restart, recreation or repair. Do not reset/reinitialize
PostgreSQL, replace its volume, change HAPI credentials/configuration or perform shared-stack
operations. Verify PostgreSQL 16 availability using private TCP, SQL and HAPI connectivity;
inspect only the catalogs, effective grants and connection headroom needed for this addition.
If recovery cannot preserve HAPI's database/data, stop for a separately reviewed resolution.

**Fresh database and least privilege.** Use the existing PostgreSQL 16 instance/volume.
After specific DDL approval, create only fresh database `keycloak`, dedicated login role
`keycloak_app` and its own `keycloak` schema. Administration creates the database; the app
role owns only its schema/objects and receives connection/schema privileges needed for
Keycloak initialization and operation. Give it no superuser, role/database creation,
replication, bypass-RLS, HAPI-role membership or HAPI data grants. Verify effective access,
including PUBLIC/inherited grants, cannot read/write HAPI data. If isolation would require
changing HAPI ACLs, report that conflict instead of modifying HAPI. Reject pre-existing
unowned/conflicting `keycloak` resources; repeat setup verifies owned state without dropping
databases, broadening grants or resetting credentials. No extra PostgreSQL instance/volume.

**Production provider.** Pin `quay.io/keycloak/keycloak:26.8.2` to a verified immutable
digest. Reuse the existing service/container name `epa-lab-keycloak`; prepare production
`start` with `KC_DB=postgres`, the private database URL, `keycloak_app`, its schema and a
protected server-held password. An optimized build is optional, not a new architecture.
Preserve health checks, strict legacy hostname, public realm HTTPS frontend authority and
trust only the verified Nginx peer. Administration, management and PostgreSQL stay private.
Keep current SPA/BFF candidates and verify the unchanged OAuth implementation against this
provider. Production startup/storage is required, but does not establish production readiness.
[Database configuration](https://www.keycloak.org/server/db),
[production configuration](https://www.keycloak.org/server/configuration-production).

**Versioned fresh provisioning.** Initialize `epa-demo` and `playground-public` using the
versioned definitions/tooling in decision 3, with protected credential inputs and fresh
synthetic demo accounts. JSON startup provisioning, if used, reads only the versioned
fresh-realm definition, never a dump of existing H2 state. Verify both realms, clients,
required PAR for ePA, public Code/S256 without PAR, audience/permission and five-minute public
Access Tokens. Repeated provisioning and restart must preserve this new owned state and
reject conflicts without overwriting realms. Generate new signing keys; do not import old
users, password hashes, keys, sessions, revoked-token records or other H2 content.
[Fresh realm provisioning](https://www.keycloak.org/server/importExport).

**Identity-reset consequences accepted, 2026-11-16.** The owner explicitly permits recreated
users, regenerated signing keys, invalidated sessions and incompatibility of old tokens and
credentials. Old account/user-ID continuity, SSO/offline/refresh-token continuity and pending
logins are not promised; see the [confirmation record](fresh-keycloak-preparation.md#owner-authorization-and-accepted-discontinuity).
Verify client secrets/configuration match
the BFF and any ePA consumer; deliver fresh demo credentials privately. Existing signed
bearers may still validate against cached old JWKS until expiry/cache refresh: record and
verify a token-drain/cache/session invalidation plan, rather than claiming instant revocation.
Do not remap HAPI records to new users or change HAPI data to conceal an identity mismatch.
Owner acceptance closes the discontinuity decision; fresh binding, cache/session and real
protocol checks remain implementation/verification work, not a reason to request acceptance again.

**Focused verification.** After recovery and approved fresh provisioning, exercise an
isolated production-mode 26.8.2 candidate on the new PostgreSQL database, with private
test listeners and no live ingress/provider replacement. Verify readiness/restart, effective
role isolation, repeat/conflict checks, administrative recovery, fresh ePA header/browser
PAR success and non-PAR rejection, standard Code/S256/OAuth session/logout and real HTTPS
metadata/JWKS. Reuse existing SPA/BFF and resource-security checks, including HAPI 200/401/403
on synthetic reads and no HAPI data writes. Record new evidence; completed tasks do not
prove that this fresh provider works. No H2 transfer or legacy-data migration rehearsal.

**Offline H2 recovery and release handoff.** During a separately approved handoff, cleanly
stop the original provider and retain `epa-auth-lab_keycloak-data` detached/offline with
its matching original image, private settings and administrative recovery inputs. Never
mount it in the 26.8.2 PostgreSQL candidate, upgrade it, export it or delete/reset it. Keep
it until the new installation is accepted; disposal would require a separate owner decision.
The packet records exact fresh-provider/database settings, image identities, fresh-flow
results, confirmed reset/token impact, H2 retention and targeted recovery/withdrawal commands.
No identity data moves between the two installations. If the fresh provider fails, withdraw
public auth first and use only an explicitly approved return to the saved original private
H2 provider; retain the fresh PostgreSQL state for investigation and account for new users,
keys and tokens issued since cutover. Do not serve both states under the same live authority
or restore/drop HAPI/shared volumes. Public fixtures remain available until separate release
approval; no live service is stopped or replaced by this planning update.

## Public-authentication activation gates

These gates block unsafe activation, not unrelated SPA/proxy preparation:

| Gate                         | Focused evidence / action                                                                                                                                                                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Available isolated storage   | PASSED: separately approved restart and fresh database/role/schema provisioning; actual password/own-schema access and zero effective HAPI data privileges verified, with HAPI configuration/catalog unchanged.                                 |
| Fresh production provider    | CANDIDATE PASSED: pinned 26.8.2 production startup, versioned realms/fresh users, real ePA/PAR and OAuth/browser/restart checks. Live handoff/public acceptance remain separate; no H2 state transfer.                                          |
| Confirmed reset and recovery | Record owner acknowledgement of regenerated users/keys and session/token/client consequences. Preserve the original H2 volume offline with matching recovery settings until acceptance; verify targeted recovery/fixture withdrawal boundaries. |
| Correct public authority     | Real browser/BFF/HAPI discovery, callback and JWKS requests use the fixed HTTPS authority; issuer, signature, audience, expiry and permission checks pass. No TLS bypass, alternate issuer or unauthenticated fallback.                         |
| Safe public boundary         | New auth routes enforce trusted proxy/canonical host, secure cookies, CSRF, bounded requests, cache isolation and secret-safe logs. Keycloak administration, legacy ePA and HAPI remain outside public ingress/direct access.                   |
| Compatibility and recovery   | Real ePA/PAR regressions and targeted fixture rollback pass. If public realm/hostname settings affect ePA, stop for a narrowly reviewed correction rather than changing legacy policy.                                                          |

The owner has resolved storage/startup: fresh PostgreSQL-backed 26.8.2 production mode.
Specific PostgreSQL recovery/provisioning approvals were granted and executed; they do not
authorize provider maintenance. Tasks 6.1/6.2 still need release approval and actual public
HTTPS acceptance. The historical Cloudflare probe and broad follow-ups do not replace these checks.

### Remaining concrete blockers

There is no unresolved database/provider-verification blocker in preparation; see the
[completed checks](fresh-keycloak-results.json). Only the live release gates remain:

1. **6.1 requires separate approval** for the exact packet and provider-maintenance handoff.
   Original H2 is preserved on the unchanged live provider and becomes offline only after
   its approved clean stop/detachment. Recheck actual peers, hostname/client/credential
   bindings and fresh private ePA/PAR before activating the reviewed public boundary.
2. **6.2 requires actual public HTTPS acceptance** through the existing Tunnel, with real
   BFF/HAPI discovery/JWKS, browser journey and security checks. Staged success does not
   establish this acceptance.

## Risks / Trade-offs

- Shared PostgreSQL outage or provisioning error → recover availability and verify limited
  effective grants before use; preserve HAPI data/configuration and reject conflicts.
- Regenerated identities/keys break old access → owner-confirmed impact, fresh credentials,
  explicit client/cache/token handling and real fresh-flow acceptance; no identity continuity claim.
- Recovery returns to different identity state → retain original H2 offline with its image,
  withdraw public auth first and reconcile newly issued credentials/tokens before a private return.
- Production-mode software is mistaken for readiness → retain experimental-beta/synthetic-only
  access and no production-readiness claim; public approval/acceptance remain separate.

## Operational follow-ups and verification

Keep the pending privileged UFW ordering/duplicate/backup-integrity inspection explicit as
an operational follow-up. Existing HAPI database privilege/resource-limit findings and the
short memory/swap snapshot are also retained in historical evidence, not declared fixed.
They do not automatically block building the public binding. Escalate a specific finding
if a focused public-auth safety/reachability check actually depends on it.

Reuse change 001's component/regression evidence and run focused checks for changed build,
profile, proxy and trust settings. Add no repeated broad readiness review or infrastructure
outage investigation from the isolated 403. Verify real login/PKCE/303/refresh/read/Inspector/
CSRF logout/old-auth rejection/history, both locales and existing accessibility behavior;
verify public path/proxy/CSRF/rate/disclosure negatives. Retain separate production advisory
findings and block known exploitable production vulnerabilities without unrelated upgrades.
Preparation implements/tests these bindings in isolation; it performs no public rollout.
