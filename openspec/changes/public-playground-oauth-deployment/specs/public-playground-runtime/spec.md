# Public Playground Runtime

## Purpose

Make the existing OAuth/OIDC mission runnable from the existing public production SPA,
preserving ePA/PAR, private FHIR authorization, data and safe protocol observations.

HAPI database/privilege migrations and broad readiness work remain excluded; the only
database addition is fresh Keycloak storage. Change 001 remains the implemented component/
security/UX baseline. Earlier acceptance does not verify the fresh provider or public binding.

**Final owner architecture decision, 2026-11-16:** reuse PostgreSQL 16 with fresh database
`keycloak`, least-privilege `keycloak_app` and production-mode Keycloak 26.8.2 in the
existing service. Provision both realms and fresh synthetic users from versioned
configuration. No H2 migration, data transfer or legacy-data migration rehearsal; retain
the original H2 volume offline for recovery until fresh-install acceptance. Planning only:
no live repair/DDL/reset, container replacement or public activation. The 11 completed
tasks, existing OAuth implementation and SPA/BFF candidate identities remain unchanged.

## ADDED Requirements

### Requirement: Explicit production execution binding

The existing SPA SHALL support an explicitly enabled production OAuth build on
`https://auth-playground.yappai.de`, served by Nginx. The fixture build MUST remain available
for rollback. Public production MUST NOT run Vite/HMR or expose credentials in browser code/storage.

#### Scenario: Enabled production candidate

- **WHEN** the approved public build is selected
- **THEN** the existing Workspace offers the implemented mission through same-origin cookie-based requests
- **AND** static production assets contain no development-server binding, bearer token or client secret.

#### Scenario: Fixture or invalid binding

- **WHEN** the fixture target is selected or the execution origin/configuration is invalid
- **THEN** fixture behavior remains available or execution fails closed
- **AND** URL parameters and browser storage cannot enable authentication.

### Requirement: Narrow same-origin public routing

Nginx SHALL proxy only the declared `/api/oauth` operations and required public demo-realm
login/OIDC/assets through existing services. Unknown API methods/paths MUST fail closed.
Legacy ePA, other realms, administration/management and direct FHIR MUST remain outside public ingress.

#### Scenario: Browser API and callback

- **WHEN** the browser calls declared login/callback/session/resource/logout/owned-events operations
- **THEN** method, status, redirect and cookie semantics reach the existing BFF unchanged
- **AND** callback returns clean HTTP 303 to `/missions/oauth-oidc/workspace` without query data.

#### Scenario: Route and origin bypass

- **WHEN** requests target unknown/encoded API paths, wrong methods, admin/management, legacy ePA, another realm or direct FHIR/service access
- **THEN** they cannot reach protected upstreams or bypass the intended public-authentication boundary
- **AND** API denials do not fall through to misleading SPA HTML.

### Requirement: Canonical public OIDC authority

The standard profile SHALL use a server-selected confidential client, fixed HTTPS issuer
and exact callback, with Authorization Code + PKCE S256 without PAR. Credentials MUST stay
server-side. Discovery/JWKS same-origin, TLS and stored-transaction validation MUST remain enforced.

#### Scenario: Real standard authentication

- **WHEN** a provisioned user starts authentication from the public Workspace
- **THEN** Keycloak performs Code/S256 without PAR or `request_uri`, and the BFF validates the correlated exchange
- **AND** successful return restores the same owned run after refresh without repeating authentication.

#### Scenario: Authority and profile substitution

- **WHEN** browser/BFF/HAPI resolve the public authority, or a caller substitutes issuer/client/callback/profile material
- **THEN** valid requests use canonical HTTPS metadata/keys and substituted or inconsistent configuration is rejected
- **AND** no private issuer, cross-origin JWKS, arbitrary redirect or disabled TLS check is substituted to obtain success.

### Requirement: Preserve ePA functionality and HAPI data

The public binding MUST preserve private ePA endpoint/issuer contracts, mandatory PAR and
profile isolation using fresh realm configuration. It MUST NOT promise continuity of old
Keycloak users, keys or sessions. HAPI PostgreSQL configuration, database, schema, data,
ownership, credentials and permissions MUST remain unchanged. The original H2 volume MUST
be retained separately for recovery until the new installation is accepted.

#### Scenario: ePA regression

- **WHEN** the fresh provider, public candidate and necessary service settings are verified
- **THEN** existing ePA header/browser operations and mandatory PAR still work, with PAR bypass rejected
- **AND** tests use freshly provisioned synthetic identities, HAPI data stays unchanged and conceptual ePA remains non-executing.

#### Scenario: Cross-profile isolation

- **WHEN** ePA/private-standard tokens, codes or cookies are substituted into the public mission or conversely
- **THEN** existing profile/issuer/client/browser ownership checks reject substitution without modifying another context.

### Requirement: Public browser session security

Public cookies MUST be host-only, Secure, HttpOnly and SameSite=Lax. Logout SHALL enforce
exact Origin and context-bound CSRF. Existing state/PKCE/correlation, expiry, replay protection,
browser/run isolation and asynchronous logout cancellation MUST remain effective.

#### Scenario: Restore and local logout

- **WHEN** a browser logs in, refreshes and performs valid local logout
- **THEN** refresh restores the same run, logout invalidates old authentication and cancels pending/in-flight attempts
- **AND** eligible bounded safe history remains inspectable only by its viewing context and cannot restore resource authority.

#### Scenario: Invalid state, race or CSRF

- **WHEN** callbacks are mismatched/replayed/expired or race with logout, or Origin/CSRF/cookies are forged
- **THEN** authentication cannot be committed or restored improperly
- **AND** cleanup succeeds even when event recording fails or storage is exhausted.

### Requirement: Private synthetic FHIR access

HAPI SHALL remain private and retain its implemented Access Token checks, `playground-fhir`
audience, `demo.fhir.read` permission, fixed `Basic/playground-demo` read and deny-by-default
FHIR policy. Only necessary issuer/JWKS configuration SHALL change; data/privileges/security
implementation MUST remain unchanged.

#### Scenario: Protected read

- **WHEN** the public BFF calls the fixed resource with a valid server-held standard Access Token and permission
- **THEN** the existing HAPI independently authorizes the synthetic read and returns 200
- **AND** the SPA receives only the existing safe result/evidence DTOs, never the token.

#### Scenario: Invalid grant or undeclared access

- **WHEN** authentication is missing/invalid/expired, issuer/audience/algorithm/key/nbf is unsuitable, an ID Token is used, or permission/operation is wrong
- **THEN** the existing 401/403 boundaries remain effective and other resources/operations are denied
- **AND** callers cannot choose arbitrary upstreams, access real patient data or reach HAPI/admin/management through public routing.

### Requirement: Controlled synthetic demo access

Public execution SHALL use owner-provisioned individual synthetic accounts, with no public
registration, shared published password or administrative grant. The owned public realm/client
SHALL be configured without importing legacy users. Demo Access Tokens MUST expire within five minutes.

#### Scenario: Provision and repeat

- **WHEN** the owned public realm/client and synthetic users are configured, then checked again
- **THEN** Code/S256, audience/permission and individual access work without copying legacy data
- **AND** repeated setup preserves owned credentials/users and rejects conflicting configuration.

#### Scenario: Unprovisioned or disabled account

- **WHEN** an unknown/disabled account, registration or unsupported grant is attempted
- **THEN** no new demo access is granted
- **AND** issued bearer validity remains bounded by expiry without claiming immediate revocation.

### Requirement: Experimental beta disclosure

Release documentation MUST identify the deployment as an experimental beta using
owner-provisioned demo accounts and synthetic-only data. It MUST describe the fresh
production-mode provider and confirmed identity-reset consequences without claiming
production readiness merely because supported storage/startup is configured.

#### Scenario: Beta release review

- **WHEN** the owner reviews the release packet or demo-access guidance
- **THEN** experimental status, fresh account provisioning, synthetic-only use and the confirmed identity-reset impact are explicit
- **AND** passing security or compatibility tests do not produce a production-readiness claim or enable public registration.

### Requirement: Trusted proxy and bounded requests

New public authentication routes SHALL accept canonical host/protocol/client identity only
through verified proxy peers. Finite operation/aggregate/in-flight limits MUST resist forged
forwarded headers. Login/resource pressure MUST NOT consume the separate logout cleanup budget.

#### Scenario: Spoofed forwarding or direct ingress

- **WHEN** Host, Forwarded, X-Forwarded or Cloudflare identity headers are forged or the trusted path is bypassed
- **THEN** callers cannot change authority/redirects, spoof trusted identity or bypass public-auth controls.

#### Scenario: Request pressure

- **WHEN** operation limits are exceeded or teaching-event capacity is exhausted
- **THEN** bounded responses provide safe retry behavior and a valid logout within its separate budget can still remove credentials
- **AND** a proxy/BFF rejection is never presented as a HAPI denial.

### Requirement: Safe evidence and cache isolation

Existing schema-1 typed events and observer/reporter distinctions MUST remain truthful.
Tokens, codes, verifiers, secrets, cookies, identity dumps, raw callbacks and complete HTTP
bodies MUST NOT appear in SPA projections or routine/error logs. Authentication/session/history
responses MUST NOT be shared-cached.

#### Scenario: Provenance and disclosure

- **WHEN** real successful/denied/unavailable events and upstream failures are inspected
- **THEN** actual BFF observations and explicit HAPI reports stay distinct from conceptual Keycloak explanations
- **AND** unsupported evidence has no raw fallback, with no secret-sentinel disclosure in controlled responses, bundles, storage or logs.

#### Scenario: Two browsers and caching

- **WHEN** two browsers read sessions/history and exercise login/resource/logout through the candidate proxy
- **THEN** ownership and cache rules prevent replaying another context's authentication, CSRF material or events.

### Requirement: Genuine public-authentication activation gates

Public authentication MUST remain disabled until PostgreSQL availability, fresh provider
provisioning/verification, identity-reset acknowledgement, offline H2 recovery retention
and required maintenance/release approvals are established. HTTPS/proxy/token/session/
private-service checks MUST still pass. Missing evidence MUST NOT be bypassed by weakening
authentication, migrating H2 data or resetting HAPI/shared storage.

#### Scenario: Missing fresh-install prerequisites or failed authentication boundary

- **WHEN** a fresh-install prerequisite, verification result or required approval is missing, or an auth boundary fails
- **THEN** activation stays blocked with the specific missing evidence or failure while public fixtures remain available
- **AND** retained historical acceptance does not substitute for fresh ePA/PAR/OAuth verification.

#### Scenario: Existing PostgreSQL availability failure

- **WHEN** the existing PostgreSQL 16 instance is unavailable through its required private TCP/SQL path
- **THEN** fresh Keycloak database provisioning and dependent provider/resource acceptance wait for diagnosed, separately approved recovery
- **AND** recovery preserves HAPI database/data/configuration without live resets, shared-volume replacement or unapproved container replacement.

#### Scenario: Isolated Cloudflare probe

- **WHEN** an isolated server-side request returns 403 while the owner confirms the website works
- **THEN** the vantage/path/result is retained without treating it as an infrastructure outage or gating unrelated build/proxy work
- **AND** actual runtime discovery/JWKS/API failures, if reproduced on required OAuth paths, remain genuine integration failures.

### Requirement: Fresh PostgreSQL Keycloak storage and production startup

The provider SHALL use immutable patched Keycloak 26.8.2 in production mode and reuse the
existing `epa-lab-keycloak` service and PostgreSQL 16 instance. It SHALL initialize a fresh,
separate `keycloak` database with dedicated least-privilege `keycloak_app`. The role MUST
have only required Keycloak privileges and no HAPI data access. HAPI database/data and
existing OAuth implementation/SPA/BFF candidates MUST be preserved.

#### Scenario: Fresh private provider

- **WHEN** PostgreSQL availability and specific provisioning approval are established
- **THEN** the fresh database/role and production provider pass readiness/restart and effective privilege checks without changing HAPI
- **AND** admin/management/database access stays private and no H2 data is attached or transferred.

#### Scenario: Conflicting resources or excessive privileges

- **WHEN** provisioning encounters unowned/conflicting resources or needs HAPI changes to satisfy isolation
- **THEN** it stops for review without dropping/resetting databases, broadening privileges or adopting conflicting state
- **AND** repeat provisioning verifies owned resources without reinitialization or secret rotation.

### Requirement: Versioned fresh realm provisioning

The fresh provider MUST provision `epa-demo` and `playground-public` from versioned
configuration with fresh synthetic users and generated signing keys. Existing H2 users,
credentials, keys, sessions and other state MUST NOT be imported or migrated. Fresh ePA/PAR
and standard OAuth behavior MUST be verified with real components; existing dated results
MUST NOT substitute for those checks.

#### Scenario: Fresh ePA and public OAuth functionality

- **WHEN** versioned configuration and protected credential inputs initialize the fresh PostgreSQL-backed provider
- **THEN** fresh ePA header/browser PAR succeeds, non-PAR ePA is rejected, and standard Code/S256 without PAR, discovery/JWKS, session and logout pass
- **AND** realm/client/profile boundaries and synthetic HAPI authorization remain effective without transferring old identities or data.

#### Scenario: Repeat provisioning and restart

- **WHEN** fresh realm/user provisioning is repeated or the production candidate restarts
- **THEN** new owned configuration, users, credentials and keys persist and conflicts are rejected without destructive overwrites
- **AND** only versioned fresh definitions are provisioning inputs; no H2 export/import or legacy-data migration rehearsal is required.

### Requirement: Confirm regenerated identity and key consequences

Before live provider replacement, the owner MUST acknowledge the effects of regenerating
legacy users and signing keys, including changed user IDs/credentials, lost session/token
continuity and affected client bindings. The release plan MUST verify fresh client secrets
and explicit session/token/cache handling. It MUST NOT claim instant rejection of old
signed tokens merely because the database or keys changed.

#### Scenario: Owner reviews fresh-install impact

- **WHEN** the fresh provider is prepared for live replacement
- **THEN** the packet records owner confirmation of account/key regeneration, new credential delivery, restarted login/SSO and client-binding consequences
- **AND** no HAPI records are remapped or changed to disguise regenerated user identities.

#### Scenario: Old authentication material

- **WHEN** old sessions, pending logins, refresh/offline tokens or signed bearers are exercised against the fresh installation
- **THEN** the documented invalidation, expiry/drain and JWKS-cache handling are verified before acceptance
- **AND** cached signing keys are not mistaken for proof of immediate old-token revocation.

### Requirement: Offline original H2 recovery retention

At separately approved provider handoff, the original H2 volume MUST be cleanly stopped,
retained offline and paired with its original private image/configuration until the fresh
installation is accepted. It MUST NOT be upgraded, exported/imported, reset, deleted or
attached to the fresh provider. Recovery MUST keep the two identity stores separate and
MUST NOT restore/reset HAPI or shared PostgreSQL storage.

#### Scenario: Retain the original installation

- **WHEN** an explicitly approved handoff changes the existing Keycloak service to the fresh PostgreSQL installation
- **THEN** the original `epa-auth-lab_keycloak-data` volume is detached/offline and its image/settings/recovery inputs are retained
- **AND** there is no H2-to-PostgreSQL data transfer or live container replacement inferred from planning confirmation.

#### Scenario: Fresh provider recovery and application withdrawal

- **WHEN** fresh-provider acceptance fails or the public application is withdrawn
- **THEN** public auth can be closed and fixtures restored independently; any return to the original private H2 provider requires explicit recovery approval and accounts for newly issued credentials/keys/tokens
- **AND** fresh PostgreSQL state is retained for review, the two stores are never merged or served concurrently under the live authority, and HAPI/shared storage stays intact.

### Requirement: Preserve Mission Control presentation

The public build SHALL preserve the existing layout/artwork, mission/capability boundaries,
German-default/English localization, keyboard/focus/reduced-motion behavior, Inspector and
timeline accessibility. Protocol identifiers/evidence MUST remain literal; language changes
MUST preserve mission/run selection without repeating protocol operations.

#### Scenario: Existing experience in both locales

- **WHEN** the production candidate is exercised in both locales, responsive layouts and existing accessibility checks
- **THEN** the established mission controls, diagram, timeline and Inspector remain usable without redesign
- **AND** authentication success, resource authorization and unavailable outcomes remain distinct and truthful.

### Requirement: Targeted deployment verification and rollback

The release SHALL reuse existing infrastructure and apply only reviewed fresh-provider
and application binding changes. Promotion MUST require real-component public acceptance,
focused fresh-flow regressions and targeted recovery/fixture withdrawal. HAPI data, ePA/PAR
functionality, offline original H2 recovery state and unrelated services MUST be preserved;
broad stack/database recreation MUST NOT be used.

#### Scenario: Public acceptance

- **WHEN** the separately authorized candidate runs through actual public HTTPS/Tunnel/Traefik/Nginx with Keycloak and HAPI
- **THEN** login without PAR, fixed return, refresh, protected read, truthful Inspector, CSRF logout, old-auth rejection and safe history pass
- **AND** public auth-path negatives, production advisory checks and ePA regressions are recorded without substituting private/staged success.

#### Scenario: Targeted withdrawal

- **WHEN** rollout or acceptance fails
- **THEN** saved fixture image/project configuration and necessary previous standard/HAPI trust settings restore fixture-only behavior and private ePA/PAR
- **AND** new OAuth forwarding is withdrawn, affected sessions are invalidated and data/volumes/unrelated services remain intact without a database restore.
