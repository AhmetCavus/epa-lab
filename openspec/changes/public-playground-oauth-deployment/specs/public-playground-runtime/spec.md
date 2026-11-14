# Public Playground Runtime

## Purpose

Make the existing OAuth/OIDC mission runnable from the existing public production SPA,
preserving ePA/PAR, private FHIR authorization, data and safe protocol observations.

This 2026-11-14 revision removes database/privilege migrations and broad readiness work.
Change 001 remains the implemented component/security/UX baseline. Owner-confirmed site and
private-mission availability do not substitute for acceptance of the new public OAuth binding.

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

### Requirement: Preserve existing ePA and data

The public binding MUST preserve the private ePA issuer, users, signing keys, clients,
credentials, PAR requirement and legacy endpoints/sessions. Existing data and volumes MUST
remain intact. Database architecture, ownership/credential migration and legacy data transfer
SHALL NOT be performed by this change.

#### Scenario: ePA regression

- **WHEN** the public candidate and its necessary service settings are verified
- **THEN** existing ePA header/browser operations and mandatory PAR still work, with PAR bypass rejected
- **AND** legacy identity/configuration and data are preserved; conceptual ePA remains non-executing.

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

Public authentication MUST remain disabled until the existing provider has a production-suitable
configuration and the new HTTPS/proxy/token/session/private-service boundaries pass. Unresolved
out-of-scope security prerequisites MUST be reported separately, without bypass or automatic
inclusion of database/infrastructure projects. Isolated preparation MAY proceed meanwhile.

#### Scenario: Unsuitable provider configuration

- **WHEN** the deployment still relies on unsupported development-only provider settings or a required auth boundary fails
- **THEN** public authentication activation is blocked with the specific evidence and a separately reviewed minimal resolution
- **AND** the working public site remains available; no database migration or security exception is silently introduced.

#### Scenario: Isolated Cloudflare probe

- **WHEN** an isolated server-side request returns 403 while the owner confirms the website works
- **THEN** the vantage/path/result is retained without treating it as an infrastructure outage or gating unrelated build/proxy work
- **AND** actual runtime discovery/JWKS/API failures, if reproduced on required OAuth paths, remain genuine integration failures.

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

The release SHALL reuse existing infrastructure, replace the public SPA and apply only
necessary reviewed binding/security settings. Promotion MUST require real-component public
acceptance, focused regressions and a tested targeted rollback. Existing data, ePA and
unrelated services MUST survive; broad stack/database recreation MUST NOT be used.

#### Scenario: Public acceptance

- **WHEN** the separately authorized candidate runs through actual public HTTPS/Tunnel/Traefik/Nginx with Keycloak and HAPI
- **THEN** login without PAR, fixed return, refresh, protected read, truthful Inspector, CSRF logout, old-auth rejection and safe history pass
- **AND** public auth-path negatives, production advisory checks and ePA regressions are recorded without substituting private/staged success.

#### Scenario: Targeted withdrawal

- **WHEN** rollout or acceptance fails
- **THEN** saved fixture image/project configuration and necessary previous standard/HAPI trust settings restore fixture-only behavior and private ePA/PAR
- **AND** new OAuth forwarding is withdrawn, affected sessions are invalidated and data/volumes/unrelated services remain intact without a database restore.
