# Design

**APPROVED narrowed preparation: 2026-11-14 — public deployment is not authorized.**
See [proposal.md](proposal.md) for scope and [tasks.md](tasks.md) for preserved tracking.

## Context

The owner confirms the public site and private OAuth integration work. The repository
already has the React mission adapter, NestJS OAuth lifecycle/events, Keycloak and secured
HAPI. The remaining gap is their production public binding: `app/runtime.ts` currently
compiles execution off for production, and `nginx.conf` serves static files only.

The historical [preflight report](repository-verification.md) is retained. Its isolated
Cloudflare 403 does not establish an infrastructure outage or override owner-confirmed
availability. Test the actual OAuth paths when implemented; a reproducible discovery/JWKS
failure from the BFF/HAPI can block authentication without implying the static site is down.
This revision supersedes earlier database/privilege and broad readiness prerequisites.

## Goals / Non-Goals

Publish the implemented mission through existing Cloudflare Tunnel → Traefik → Nginx,
with the existing BFF, Keycloak and private HAPI. Follow ADR-0001 through ADR-0004; preserve
Mission Control visuals, DE/EN behavior, accessibility and truthful observations.

Exclude PostgreSQL topology/roles, HAPI privilege or data migration, legacy storage transfer,
generic frameworks, new services/dependencies, fleet restructuring and broad readiness,
backup/restore or shared-outage programmes. Existing ePA/PAR functionality and data remain.

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
users or recreate `epa-demo`. Keep demo Access Tokens at most five minutes.

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

### 6. Targeted release and rollback

Build/test privately first. The release packet contains exact SPA/BFF image identities,
necessary settings/realm/proxy diffs, affected service names, acceptance results and exact
apply/rollback commands. Preserve the current fixture image and only the configuration
values being replaced. No full-stack `compose down`, volume reset or migration rollback.

After separate release approval, replace the public SPA with the production target and
apply only reviewed, necessary BFF/Keycloak/HAPI binding changes. Keep unrelated services,
Tunnel routing, databases and data intact. Verify the actual public browser journey before
claiming OAuth is available; staged/private success is supporting evidence, not public acceptance.

On failure restore the saved fixture image/project routing and previous standard/HAPI trust
settings as needed, invalidate affected BFF sessions and withdraw new OAuth/provider forwarding.
Keep ePA and data intact; disable rather than delete owned public configuration. Restore the saved fixture image with the reviewed withdrawal configuration: close OAuth/provider forwarding and suppress raw URL/error logs, including late callbacks. Verify
fixture navigation and private ePA/PAR after rollback. A provider/storage transition is not
part of this rollback, and no database restore is required.

## Public-authentication activation gates

These gates block unsafe activation, not unrelated SPA/proxy preparation:

| Gate                         | Focused evidence / action                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production-suitable Keycloak | The checked-in Compose still declares `start-dev` and `KC_DB=dev-file`. Verify actual suitability before public login. Keycloak documents dev-file as unsuitable for production. If still present, resolve this separately with owner-reviewed scope; do not publish it as production-ready or bundle PostgreSQL architecture/migration into this change. |
| Correct public authority     | Real browser/BFF/HAPI discovery, callback and JWKS requests use the fixed HTTPS authority; issuer, signature, audience, expiry and permission checks pass. No TLS bypass, alternate issuer or unauthenticated fallback.                                                                                                                                   |
| Safe public boundary         | New auth routes enforce trusted proxy/canonical host, secure cookies, CSRF, bounded requests, cache isolation and secret-safe logs. Keycloak administration, legacy ePA and HAPI remain outside public ingress/direct access.                                                                                                                             |
| Compatibility and recovery   | Real ePA/PAR regressions and targeted fixture rollback pass. If public realm/hostname settings affect ePA, stop for a narrowly reviewed correction rather than changing legacy policy.                                                                                                                                                                    |

Provider database choice and any required legacy transfer are explicitly outside this plan.
The production-provider gate remains open until verified; exclusion is not a security waiver.
[Keycloak database guidance](https://www.keycloak.org/server/db)

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
