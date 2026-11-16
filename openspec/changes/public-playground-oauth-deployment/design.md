# Design

**APPROVED narrowed preparation: 2026-11-14 — public deployment is not authorized.**
See [proposal.md](proposal.md) for scope and [tasks.md](tasks.md) for preserved tracking.

**Final owner decision, 2026-11-16:** keep H2 `dev-file` and the existing development
startup for an experimental public beta. Tasks 5.3–5.5 retain their earlier preparation
authorization but now cover only Keycloak 26.8.0 → 26.8.2, consistent H2 backup and tested
rollback. This planning update performs no implementation or live operation; a live backup
pause, provider upgrade and tasks 6.1/6.2/public activation still need specific approval.
The 11 completed tasks and existing public release candidate remain unchanged.

The storage-transition proposals and production-storage gate in the dated
[execution evidence](keycloak-production-verification.md) and [release packet](release-packet.md)
are superseded by decision 7 below. Retain their actual observations and saved artifacts;
task 5.5 refreshes the executable packet only after new backup/upgrade/rollback evidence exists.

## Context

The owner confirms the public site and private OAuth integration work. The repository
already has the React mission adapter, NestJS OAuth lifecycle/events, Keycloak and secured
HAPI. Preparation tasks 1.1–5.2 now have verified production SPA/Nginx and backend candidates;
default builds and the deployed public site remain fixture-only. The existing Keycloak
runs `start-dev --import-realm` with `KC_DB=dev-file`. The owner explicitly retains this
unsupported production storage/startup combination for the experimental beta; provider
preparation now addresses the recorded security patch, state preservation and recovery.

The historical [preflight report](repository-verification.md) is retained. Its isolated
Cloudflare 403 does not establish an infrastructure outage or override owner-confirmed
availability. Test the actual OAuth paths when implemented; a reproducible discovery/JWKS
failure from the BFF/HAPI can block authentication without implying the static site is down.
This revision supersedes earlier database/privilege and broad readiness prerequisites.

## Goals / Non-Goals

Publish the implemented mission through existing Cloudflare Tunnel → Traefik → Nginx,
with the existing BFF, Keycloak and private HAPI. Follow ADR-0001 through ADR-0004; preserve
Mission Control visuals, DE/EN behavior, accessibility and truthful observations.

Retain `epa-lab-keycloak`, the existing `epa-auth-lab_keycloak-data` H2 volume, all existing
realms/users/clients/keys and OAuth implementation. Preserve the prepared SPA/BFF candidates
and fixture rollback. Exclude Keycloak PostgreSQL migration, database provisioning, role
creation, export/import state transfer and storage/startup transitions. HAPI PostgreSQL
settings/data/privileges, new services/dependencies, fleet restructuring and broad readiness
reviews remain outside scope. Existing ePA/PAR issuer, policies and data are the baseline.

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

Configure the dedicated demo realm in the existing Keycloak instance using owned settings,
fresh credentials and owner-provisioned individual synthetic accounts; registration stays
disabled. Reuse existing client tooling with repeat/conflict checks. Do not copy legacy
users into the public realm or recreate `epa-demo` from fixtures. Keep demo Access Tokens
at most five minutes.

Add standard-only `PLAYGROUND_OIDC_ISSUER` with legacy fallback. Bind origin/callback/issuer
and cookies to the server-selected profile; retain transaction/token validation. Preserve
legacy `OIDC_*`, the ePA issuer, signing keys, clients, users and mandatory PAR. Use the
public realm's frontend URL rather than silently changing the global legacy hostname;
prove pinned-version dual-realm behavior. Keycloak documents explicit hostname/proxy
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

The recorded HAPI/PostgreSQL availability issue is a separate operational concern. Do not
repair it or change its PostgreSQL configuration in tasks 5.3–5.5. It does not block
Keycloak backup, patch compatibility or provider rollback rehearsal. If still present at
public acceptance, report the actual unavailable resource outcome and withhold a successful
resource-journey claim; no database migration or recovery project is implied.

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

On failure restore the saved fixture image/project routing and previous standard/HAPI trust
settings as needed, invalidate affected BFF sessions and withdraw new OAuth/provider forwarding.
Keep ePA and data intact; disable rather than delete owned public configuration. Restore the saved fixture image with the reviewed withdrawal configuration: close OAuth/provider forwarding and suppress raw URL/error logs, including late callbacks. Verify
fixture navigation and private ePA/PAR after rollback. Ordinary SPA withdrawal requires
no provider-data restore and does not downgrade Keycloak. A failed provider image upgrade
uses the separately tested H2 recovery below. Neither recovery touches HAPI PostgreSQL.

### 7. Retained H2 beta and focused Keycloak security upgrade

**Accepted beta boundary.** Retain the existing `epa-lab-keycloak` service/container name,
H2 `dev-file` volume/data and development startup; add no persistent provider service or
database. The public deployment is an **experimental beta**, with **owner-provisioned
individual demo accounts**, **synthetic-only data** and **no production-readiness claim**.
The owner accepts the unsupported production storage/startup risk, including availability
and durability limitations. This is not evidence of production suitability, high
availability or supported H2 schema upgrades. Keep registration disabled, credentials
privately delivered, no administrative grants for demo users and existing token bounds.
Keycloak documents `dev-file` as development-only and warns against production `start-dev`.
[Database guidance](https://www.keycloak.org/server/db),
[container startup guidance](https://www.keycloak.org/server/containers#_trying_keycloak_in_development_mode).

**Patch only.** Prepare `quay.io/keycloak/keycloak:26.8.2` pinned to a verified immutable
digest, replacing the recorded 26.8.0 image only after separate live-maintenance approval.
Preserve the existing container/service identity, volume attachment, realms, user IDs,
credentials, clients, signing keys, issuers and PAR policies. Keep existing OAuth code,
SPA/BFF candidate identities and reviewed HTTPS/proxy settings. There is no PostgreSQL
provisioning, role creation, storage-engine conversion or production-startup requirement.
The [26.8.2 security release](https://github.com/keycloak/keycloak/releases/tag/26.8.2)
includes the recorded theme-resource disk-exhaustion fix. Check only 26.8.1/26.8.2 changes
relevant to existing realms, login, mapper tooling and recovery; no unrelated upgrade work.

**Consistent source.** Use an administrator-supplied, verifiably consistent H2 backup or
obtain approval for a bounded stop/copy/start window for `epa-lab-keycloak` only. After a
clean shutdown, copy the complete persisted `/opt/keycloak/data` state and preserve the
matching 26.8.0 image/configuration, mounts and any required provider/theme assets. Record
version, provenance, clean-stop consistency, checksums and restore verification. Keep the
backup protected and immutable, with 0700 directories/0600 files; no secrets or state dumps
in Git/reports/logs. A hot H2 file copy, fixture export, partial/masked realm export or SPA
rollback archive is not a substitute. Preserve the existing named volume and data; do not
reset it or execute a live pause during this planning update.

**Isolated upgrade and rollback rehearsal.** Restore a working copy of that backup into
an isolated, loopback-only candidate, without mounting the live volume or joining live
ingress/provider clustering. Establish the 26.8.0 baseline, then exercise 26.8.2 and a
restart against the copied H2 state. Verify administrative recovery, realm/user IDs,
credential behavior, client configuration/secrets, signing-key fingerprints, legacy
issuer/required PAR and standard OAuth with real components. Keep public synthetic accounts
separate from legacy users. Do not use fixture import, password resets or key regeneration
to conceal missing state. Reuse the existing public candidate for focused HTTPS/proxy,
discovery/JWKS, session/logout and disclosure checks; HAPI availability is separate.

Keycloak explicitly does not support schema migration with H2 `dev-file`; this rehearsal
must demonstrate the exact patch on the actual preserved copy and cannot confer vendor
support. On failure, stop and report it without adding a database transition. The
[26.8.2 upgrade guide](https://www.keycloak.org/docs/26.8.2/upgrading/)
also requires old installation and backup recovery instead of a database downgrade.
Test rollback by stopping the upgraded isolated candidate, retaining its state separately,
restoring a fresh copy of the untouched pre-upgrade H2 backup and running the saved 26.8.0
image/configuration. Never point 26.8.0 at files written by 26.8.2 or run both against one
H2 store. Verify the same state comparisons, administrative recovery and ePA/standard
regressions after restore. No live restore or volume deletion is part of preparation.

**Release handoff.** Record exact source/target image digests, backup manifest, isolated
results and targeted upgrade/restore commands in task 5.5's packet refresh; keep existing
SPA/BFF candidate and fixture rollback identities. Resolve maintenance duration, in-flight
login restart, possible reauthentication, token/session/revocation effects and post-upgrade
identity writes before live approval. Preserve changed state for investigation; do not
silently restore stale passwords/policies/revocations. The rollback decision must reconcile
such writes and any already issued tokens. An approved provider image upgrade targets only
the existing Keycloak service and retains its H2 volume; public forwarding remains disabled
until separately approved. Neither a backup nor a successful patch rehearsal authorizes
live changes, activates public OAuth or warrants a production-readiness claim.

## Public-authentication activation gates

These gates block unsafe activation, not unrelated SPA/proxy preparation:

| Gate                               | Focused evidence / action                                                                                                                                                                                                                                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Patched, recoverable beta provider | Complete the focused 26.8.2 H2-copy upgrade/restart and old-image/pre-upgrade-backup rollback rehearsal, state comparisons and packet refresh in 5.3–5.5. Obtain specific approval before live backup/upgrade maintenance. H2/development startup is the accepted experimental-beta risk, not a production-storage gate. |
| Correct public authority           | Real browser/BFF/HAPI discovery, callback and JWKS requests use the fixed HTTPS authority; issuer, signature, audience, expiry and permission checks pass. No TLS bypass, alternate issuer or unauthenticated fallback.                                                                                                  |
| Safe public boundary               | New auth routes enforce trusted proxy/canonical host, secure cookies, CSRF, bounded requests, cache isolation and secret-safe logs. Keycloak administration, legacy ePA and HAPI remain outside public ingress/direct access.                                                                                            |
| Compatibility and recovery         | Real ePA/PAR regressions and targeted fixture rollback pass. If public realm/hostname settings affect ePA, stop for a narrowly reviewed correction rather than changing legacy policy.                                                                                                                                   |

The owner has resolved storage/startup: retain H2 and development mode. No database/role
approval or production-storage transition is a remaining gate. Separate release approval
for tasks 6.1/6.2 and actual public HTTPS acceptance remain necessary. The historical
Cloudflare probe and broad operational follow-ups do not replace these concrete checks.

### Remaining concrete blockers

1. No consistent Keycloak H2 backup was verified in the inspected saved artifacts. Supply
   a verifiable backup or approve the bounded Keycloak-only cold-backup maintenance window.
2. The exact immutable 26.8.2 candidate, real H2 preservation/upgrade/restart and restore-based
   rollback evidence are still missing. Tasks 5.3–5.5 remain unchecked; the packet needs
   the resulting digests, backup/recovery commands and maintenance/session decisions.
3. Live provider maintenance and public release tasks 6.1/6.2 are not approved. Actual
   Tunnel/BFF/HAPI authority, ingress and browser/resource acceptance must be demonstrated
   at the approved release; staged results do not establish those actual-edge results.

**Separate HAPI availability issue:** the last report records an unavailable PostgreSQL
task/private TCP path. It has not been repaired or freshly diagnosed in this planning
update. It is not a Keycloak preparation blocker; if still present, it prevents successful
resource acceptance and needs its own targeted operational handling. Do not change HAPI's
PostgreSQL configuration or treat its historical privilege findings as upgrade prerequisites.

## Risks / Trade-offs

- Unsupported H2/development startup and H2 upgrade behavior → explicit owner-accepted
  experimental beta, synthetic-only access, tested copies/backups and no production claim;
  a passing rehearsal does not make that configuration supported.
- Patch failure or incompatible persisted state → protected pre-upgrade H2 backup, saved
  image/settings and tested restore; never downgrade the upgraded store in place.
- Maintenance interruption or stale-state recovery → separately approved bounded window,
  explicit login/session/token impact and reconciliation of later identity/revocation writes.

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
