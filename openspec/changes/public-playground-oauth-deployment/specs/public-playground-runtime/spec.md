# Public Playground Runtime

## Purpose

Make the existing synthetic OAuth learning mission publicly runnable through a controlled
HTTPS production deployment, preserving legacy ePA behavior, private resource authorization
and honest protocol evidence.

The accepted non-deployment authorization, lifecycle, resource and mission contracts from
`001-oidc-pkce` remain the regression baseline. This capability changes its public deployment
boundary only after approval; it does not waive those existing security or UX guarantees.

## ADDED Requirements

### Requirement: Explicit production execution binding

The hosted OAuth mission SHALL execute only through an explicitly configured production
build at `https://auth-playground.yappai.de`. It MUST preserve the existing fixture build
and conceptual ePA preview and MUST NOT use a development server for public production.

#### Scenario: Enabled public release

- **WHEN** an approved, verified public release is selected
- **THEN** the existing catalog opens the real OAuth Workspace with account-required demo availability
- **AND** static production assets are served without a development server, HMR or private listener URLs.

#### Scenario: Disabled or invalid configuration

- **WHEN** the default fixture build is used or public origin/trust settings are invalid
- **THEN** fixtures remain non-executing or the public release fails closed
- **AND** URL parameters, browser storage and caller-selected settings cannot enable execution.

### Requirement: Narrow same-origin public routing

While public execution is enabled, the public origin SHALL route only the declared OAuth
browser API and required demo-realm login/OIDC paths to their existing services. It MUST keep legacy ePA endpoints, other realms,
Keycloak administration/management and direct FHIR access outside public ingress.

#### Scenario: Allowed browser API

- **WHEN** the browser uses declared `/api/oauth` methods and owned-run routes
- **THEN** requests reach the existing BFF on the application origin with bounded time/body limits
- **AND** callback redirects return 303 to `/missions/oauth-oidc/workspace` without query data.

#### Scenario: Forbidden or ambiguous routes

- **WHEN** public requests target `/admin`, the administrative realm, `epa-demo`, legacy `/login`, `/callback`, `/session`, `/epa`, FHIR, management paths, unknown API operations or encoded variants
- **THEN** they are denied without forwarding to protected services or falling through to a misleading API HTML response
- **AND** unsupported methods cannot invoke the corresponding operation.

### Requirement: Canonical public OIDC authority

Public login SHALL use a confidential, server-selected standard client with a canonical
HTTPS issuer and exact callback. It MUST enforce Code + PKCE S256 without PAR and keep
credentials server-side. Issuer/JWKS same-origin checks and transaction-bound validation
MUST remain enforced.

#### Scenario: Real public authentication

- **WHEN** an eligible browser starts authentication and the demo user signs in at Keycloak
- **THEN** authorization uses Code/S256 without a PAR request or `request_uri`
- **AND** validated exchange completes the existing fixed Workspace return.

#### Scenario: Public discovery and keys

- **WHEN** browsers, the BFF and HAPI resolve the configured authority from their actual runtime networks
- **THEN** advertised issuer, authorization, token and JWKS URLs use the intended HTTPS authority
- **AND** no private address, alternate issuer, cross-origin key URL or disabled TLS validation is substituted.

#### Scenario: Invalid authorization evidence

- **WHEN** PKCE is missing/invalid, a code is unusable, or issuer/client/callback/token claims are substituted
- **THEN** authentication is rejected and no authenticated application session is committed.

### Requirement: Independently verified ePA compatibility

The release MUST preserve the existing private ePA issuer, users, signing keys, client identity, credentials,
required-PAR policy and legacy browser/header contracts. Public execution SHALL NOT depend
on an unverified change to those settings or expose the conceptual ePA mission as runnable.

#### Scenario: Compatibility before and after cutover

- **WHEN** provider migration, public proxy settings and the public release are tested
- **THEN** the existing stateless header operation and browser `/login` → `/callback` → `/session` complete through PAR
- **AND** ePA PAR bypass is rejected, private discovery/issuer and preservation fingerprints match, and the conceptual preview remains non-executing.

#### Scenario: Cross-context substitution

- **WHEN** private ePA or private-standard codes, cookies or tokens are substituted into the public mission, or public material is substituted into ePA
- **THEN** profile/issuer/client binding rejects the substitution without mutating another context.

### Requirement: Controlled individual demo access

The public realm SHALL be provisioned from scratch with new individual synthetic demo accounts
provisioned by the owner. Public setup MUST NOT require importing existing demo users or private-realm data.
Public registration, shared published credentials and administrative privileges MUST be
absent. Existing issued demo access SHALL expire within five minutes; disabling an account
MUST block new authentication without claiming immediate revocation of issued bearer tokens.

#### Scenario: Fresh public setup independent of existing demo data

- **WHEN** the public realm and its accounts are provisioned initially and the procedure is repeated
- **THEN** its owned definition, fresh realm keys/client credentials and new synthetic accounts support the standard mission without copied legacy/demo users or history
- **AND** repetition verifies the existing owned configuration without rotating credentials, resetting users or adopting a conflicting realm; legacy ePA state remains separate and intact.

#### Scenario: Eligible demo user

- **WHEN** the owner provides an individual fictional demo identity through a private delivery process
- **THEN** that user can authenticate at Keycloak and obtain only the synthetic exercise grant
- **AND** no password, account identifier or raw identity claim is published in the learning surface.

#### Scenario: Unprovisioned or disabled access

- **WHEN** an unprovisioned/disabled user attempts authentication, registration or an unsupported grant
- **THEN** no new demo authentication/grant is created
- **AND** previously issued access cannot outlive its configured five-minute maximum.

### Requirement: Public browser and proxy security

Public session cookies MUST be host-only, Secure, HttpOnly and appropriately scoped with
SameSite=Lax. The system SHALL enforce its canonical HTTPS host, exact logout Origin and
context-bound CSRF value, accepting proxy identity only through explicitly trusted peers.
Existing one-time, ownership, expiry and logout cancellation guarantees MUST survive.

#### Scenario: Secure session and logout

- **WHEN** the actual public HTTPS browser completes login, reload and local logout
- **THEN** cookies have the required flags, refresh restores the same owned run, and valid Origin/CSRF logout invalidates old authentication
- **AND** eligible safe history remains owned and cannot authorize resource access.

#### Scenario: Forged origin or proxy input

- **WHEN** callers forge Host, Forwarded, X-Forwarded-*, client-IP headers, CSRF or Origin, or bypass the trusted ingress
- **THEN** public canonical-host/HTTPS/ownership protections cannot be bypassed and no attacker-selected redirect is produced.

#### Scenario: Callback races and lost state

- **WHEN** callbacks have invalid/missing correlation, replay, race, expire, arrive after restart or complete asynchronously during logout
- **THEN** no stale or foreign callback can restore authentication or overwrite the replacement viewing context
- **AND** cleanup succeeds even when event storage is exhausted or recording fails.

### Requirement: Private synthetic FHIR authorization

HAPI SHALL remain privately reachable only and allow solely the declared fictional
`Basic/playground-demo` read with a valid public Access Token and `demo.fhir.read`.
Its existing independent token checks, deny-by-default operation policy and data-free
health exceptions MUST remain intact.

#### Scenario: Authorized synthetic read

- **WHEN** an authenticated public browser requests the fixed resource through the BFF
- **THEN** HAPI independently authorizes its server-held Access Token and the BFF returns the bounded synthetic result
- **AND** no patient/clinical data or arbitrary destination can be selected.

#### Scenario: Invalid credentials or undeclared operation

- **WHEN** a token is absent, malformed, forged, expired, not-yet-valid, an ID Token or from the wrong issuer/audience, or permission/operation is unsuitable
- **THEN** authentication failures yield 401 and authenticated permission/operation failures yield 403
- **AND** alternative FHIR interfaces, writes and bypass routes stay denied; private liveness/readiness remain data-free.

#### Scenario: Public resource-server bypass

- **WHEN** an external caller attempts direct resource-server, database, health-management or alternate proxy access
- **THEN** no public route or public service port reaches those interfaces.

### Requirement: Bounded abuse controls

Public execution SHALL enforce finite per-client and aggregate request/concurrency budgets
using verified ingress identity, plus provider login-abuse protection. Resource/login
exhaustion MUST NOT consume the independent logout cleanup budget or bypass the existing
context/run/event collection limits.

#### Scenario: Exceeding configured limits

- **WHEN** real requests exceed an operation's configured budget
- **THEN** bounded 429 responses provide a safe retry indication without additional provider/resource work
- **AND** changing forged IP headers or arbitrary cookies cannot evade the limit.

#### Scenario: Cleanup under pressure

- **WHEN** login/resource quotas or teaching-event capacity are exhausted
- **THEN** an otherwise valid logout within its separate budget still removes credentials and cancels attempts
- **AND** the UI does not invent successful logout or a Resource Server denial for an edge rejection.

### Requirement: Safe public evidence and caching

Public APIs/events SHALL retain strict schema-version-1 evidence and truthful observer/reporter
semantics. Credentials, raw callbacks, identity dumps and full protocol bodies MUST be absent
from teaching responses and routine logs across the controlled ingress stack. Authentication,
session and owned-history responses MUST NOT be shared-cached.

#### Scenario: Actual protocol observations

- **WHEN** successful, denied, unavailable or rate-limited public operations are inspected
- **THEN** actual BFF observations and explicit HAPI reports remain distinct from explanation
- **AND** unknown schemas or unavailable reports never produce fabricated provider-internal evidence.

#### Scenario: Disclosure and cache isolation

- **WHEN** two browsers exercise callback, login errors, session/events, resource failures and logout through the actual public path
- **THEN** secret-sentinel scans of controlled logs, API projections, UI and storage pass
- **AND** caches cannot replay another browser's session, anti-CSRF value, history or authentication response.

### Requirement: Reproducible production provider and HAPI lifecycle

Public ingress MUST remain disabled until the provider uses supported production startup
and verified legacy-state transfer into private database `keycloak`. Public realm/accounts
SHALL be created fresh. HAPI SHALL retain its existing database/data through a targeted
privilege transition, without data migration or transformation. The canonical lifecycle
MUST retain HAPI trust, limits and conflict-safe initialization without an optional overlay.

#### Scenario: Legacy provider storage transition and failure

- **WHEN** the pinned provider version's offline CLI export/import is rehearsed from a consistent legacy dev-file copy and later applied in the separately approved maintenance window
- **THEN** the ePA realm/users/credentials/client identities, signing keys, issuer and PAR policies remain intact, administrative recovery works, and new ePA signatures verify against the original public keys
- **AND** masked/partial export, copying running H2 files, overwritten target realms or unproven key preservation cannot pass; failure keeps ingress closed and permits tested original-volume recovery before writes resume, without promising session continuity.

#### Scenario: Ordinary host restart and fresh setup

- **WHEN** the documented canonical host/Yoster lifecycle or fresh recursive setup is exercised
- **THEN** reviewed images, public/provider trust, HAPI memory/heap settings and conflict-safe fixture policy are reproduced
- **AND** restart never silently removes required settings or overwrites conflicting data.

### Requirement: Shared PostgreSQL instance with separate databases

HAPI and Keycloak SHALL reuse the existing PostgreSQL 16 container and persistent volume,
with databases `hapi` and `keycloak` respectively. No second PostgreSQL container, production
database volume or public PostgreSQL port SHALL be introduced. Database communication MUST
remain private.

#### Scenario: Shared-instance database separation

- **WHEN** the production configuration is verified before and after the storage/privilege transitions
- **THEN** the same existing PostgreSQL container/volume serves both named databases through private endpoints
- **AND** HAPI retains its database, logical schema and data, uses `hapi_app`, and Keycloak uses `keycloak_app` for `keycloak`, with separate runtime credentials and only reviewed ownership/grant changes.

### Requirement: Least-privileged application database access

HAPI and Keycloak SHALL use non-superuser accounts `hapi_app` and `keycloak_app`, limited to
their own schema/runtime needs. Runtime access to other databases and administrative
privileges MUST be denied. Existing bootstrap administrator `hapi` MUST remain available
only for administration/recovery, absent from applications. HAPI logical data/schema and
the persistent volume MUST be preserved during the targeted privilege/credential transition.

#### Scenario: Restricted runtime credentials

- **WHEN** each application uses its actual runtime credentials from its configured private peers
- **THEN** required own-database schema/data operations succeed, while `hapi_app` to `keycloak` and `keycloak_app` to `hapi` connections fail
- **AND** neither role has superuser, database/role-creation, replication, row-security-bypass, database ownership or elevated membership/SET ROLE privileges; other database targets are denied.

#### Scenario: Bootstrap administrator separation and recovery

- **WHEN** the restricted runtime and operator recovery path are verified, including ordinary application recreation
- **THEN** bootstrap `hapi` remains OID 10 with its administrator credential and system/database ownership intact, and independent operator recovery succeeds
- **AND** no application receives or uses the bootstrap credential, bootstrap TCP access is denied, and neither restart nor recovery silently restores administrator application access.

#### Scenario: Targeted privilege transition without HAPI data migration

- **WHEN** restricted roles are rehearsed on representative synthetic schemas and the approved HAPI privilege transition is later applied in place
- **THEN** necessary table/sequence/index/constraint privileges and application startup work, while live HAPI retains its original database, data, logical schema and sequence state at the frozen transition boundary
- **AND** the privilege transition performs only approved owner/grant/credential/access changes, without HAPI dataset copy, replacement database, ETL or schema conversion; system/extension ownership and administrative boundaries stay intact and ordinary backup tests remain separate.

#### Scenario: Default grants and authentication-rule bypass attempts

- **WHEN** real runtime logins attempt other databases, local/loopback or alternate network paths, replication or password-free authentication
- **THEN** explicit own-database grants and ordered private authentication rules enforce the same boundary without fallback to broad PUBLIC/trust rules
- **AND** denied connections, peer-role/administrator escalation and system/extension administration remain denied without weakening the independent operator recovery path.

### Requirement: Idempotent database provisioning and safe rollback

Provisioning SHALL create only missing owned runtime roles and database `keycloak`, and
apply only reviewed, recorded application ownership/grant/access changes. Reruns MUST
verify a no-op without rotating credentials. Conflicts MUST fail closed. Rollback MUST
preserve data and administrative recovery, without dropping objects/roles/databases,
resetting volumes, restarting shared PostgreSQL or restoring application superuser use.

#### Scenario: First run and repeat verification

- **WHEN** provisioning runs initially, is rechecked after an interruption and runs again
- **THEN** only the required owned resources and scoped access controls are created once, then verified without duplicate grants or secret rotation
- **AND** HAPI logical data/schema/sequence values remain intact, owner/ACL states match the recorded privilege changes, and no data-migration or generic resumable migration framework is required.

#### Scenario: Conflict or partial provisioning failure

- **WHEN** a resource name has conflicting ownership/settings/credentials or provisioning fails partially
- **THEN** public ingress stays disabled and only safely owned changes can be withdrawn using the reviewed change record
- **AND** unrelated objects/credentials are untouched, retained data is not deleted and shared PostgreSQL is not reset, recreated or restored.

#### Scenario: Privilege transition recovery

- **WHEN** an ownership/grant or application credential transition fails, or a later provider/public release is withdrawn
- **THEN** transactional or recorded owner/ACL/config reversal retains data and independently verified administrator access; a successful privilege transition remains in place during provider/public rollback
- **AND** affected applications stay stopped if recovery would require bootstrap credentials; restoring application superuser use is never an automatic fallback and an unverified recovery path blocks release.

### Requirement: Separate verified database backups and restores

Each database MUST have a separate private logical backup and verified restore procedure,
including required ownership/permission and protected role metadata. A database-specific
restore MUST NOT overwrite the other database. Restoring the shared physical volume or
cluster-wide roles MUST NOT be treated as provider-only rollback.

#### Scenario: HAPI backup restoration

- **WHEN** the `hapi` backup is fully restored into a guarded empty verification database
- **THEN** ordinary recovery checks match the backup's schema/owner/grant/sequence baseline and any explicit rehearsal-role mapping, including synthetic-resource reads
- **AND** this backup assurance does not require a HAPI data-migration or pre/post migration restore matrix; live HAPI/Keycloak data, credentials and the existing volume are not reset or overwritten.

#### Scenario: Keycloak backup restoration

- **WHEN** the separate `keycloak` backup is restored into its guarded empty verification target
- **THEN** realm/user/client/credential/signing-key/ePA-policy checks and provider startup/login tests pass
- **AND** restored runtime privileges remain restricted, live HAPI access/data remain unchanged, and neither shared-volume/global-role replay nor broadened live runtime database access is used for that restore.

### Requirement: Verified shared-instance capacity and failure behavior

The release SHALL verify combined connection, memory, storage, I/O and recovery capacity,
bound both runtime-role connection budgets and application pools, and reserve administrative
and recovery headroom without silently changing global/HAPI pool settings. Monitoring and
maintenance procedures MUST reflect that shared PostgreSQL failure affects both applications.

#### Scenario: Mixed workload and recovery budgets

- **WHEN** measured HAPI/provider load, backups/restores and connection-pressure tests are assessed
- **THEN** bounded non-superuser application settings fit the verified server budget, including HAPI's loss of superuser-reserved access and protected administrative/recovery headroom
- **AND** insufficient capacity or unacceptable interference blocks release rather than triggering implicit global/HAPI changes.

#### Scenario: Shared outage and targeted provider recovery

- **WHEN** a controlled shared-server outage/recovery and a separate provider-only rollback are rehearsed
- **THEN** monitoring reports the shared impact and both application/database contracts recover through the documented maintenance procedure
- **AND** provider-only rollback does not stop/recreate shared PostgreSQL, restore `hapi` or replace/delete the persistent volume.

### Requirement: Preserve Mission Control presentation

The public release SHALL preserve approved artwork, layout, capability boundaries, keyboard
and reduced-motion behavior, German-default/English localization and literal technical
evidence. Runtime status MUST distinguish demo availability, authentication, resource
authorization, rate limiting and unavailable dependencies without fake progress.

#### Scenario: Localized accessible execution

- **WHEN** both locales are tested at 1366, 1024, 390 and 320 CSS pixels and actual 100%/200% browser zoom
- **THEN** actions, focus, timeline, actor map, Inspector and text alternative remain usable
- **AND** locale changes preserve mission/run/event/selection identity without repeating protocol operations.

### Requirement: Verified release monitoring and targeted withdrawal

Public promotion SHALL require recorded real-component acceptance, security negatives,
production dependency checks, monitoring and an exercised targeted rollback. Failures or
missing required evidence MUST block promotion or withdraw public execution while preserving
legacy functionality, unrelated projects and existing data.

#### Scenario: Public release acceptance

- **WHEN** the candidate traverses actual public DNS/HTTPS/Tunnel/Traefik/Nginx with Keycloak and HAPI
- **THEN** login, fixed return, same-run refresh, synthetic read, truthful Inspector, CSRF logout, old-session rejection and owned safe history pass
- **AND** public negative security, ePA regressions, fresh checkout, restart/recovery, quality and scoped production audit results are recorded without substituting isolated harness success.

#### Scenario: Monitoring and rollback

- **WHEN** public availability, provider/resource readiness, denial/rate-limit rates or capacity errors cross documented thresholds, or release acceptance fails
- **THEN** existing operations tooling detects the condition with safe diagnostics and an identified response owner
- **AND** tested withdrawal restores the recorded fixture-only public release, removes public OAuth/provider ingress and preserves data and ePA behavior without a shared-stack teardown.
