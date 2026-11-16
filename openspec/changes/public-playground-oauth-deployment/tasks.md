# Tasks

**APPROVED narrowed preparation, 2026-11-14 — no live deployment.** Preparation approval
remains bounded to 1.1–5.2; public rollout tasks 6.1/6.2 still require separate approval.
Follow the narrowed [proposal](proposal.md), [design](design.md) and [specification](specs/public-playground-runtime/spec.md).

**DRAFT prerequisite extension, 2026-11-16:** the owner confirmed these planning revisions
only. New tasks 5.3–5.5 require implementation authorization; any required live source-backup
pause or shared-instance database provisioning also needs specific approval. No deployment,
database creation, maintenance or public activation is authorized by that confirmation.

**Preparation implementation authorized, 2026-11-16:** the owner's subsequent explicit
apply request authorizes tasks 5.3–5.5 only. Their specific database-mutation and live
maintenance gates remain in force. The [current execution evidence](keycloak-production-verification.md)
records partial task 5.3 and blockers; none of 5.3–5.5 is complete. Public activation and
tasks 6.1/6.2 remain unapproved.

All 13 existing IDs and checkbox states are retained; draft 5.3–5.5 add three unchecked tasks.
Completed task 1.1 below is preserved verbatim
as earlier approval history; its database/privilege references are superseded and are not
instructions to revive HAPI privilege/data work. The narrow Keycloak exception applies only
to the new draft tasks. Keep historical [verification](repository-verification.md), completed
[preparation evidence](preparation-verification.md) and change 001 unchanged. The isolated
403 is not an infrastructure-outage prerequisite.

## 1. Confirm the public binding

- [x] 1.1 Record the existing preparation approval for tasks 1.1–5.2 and the separate live-database/public-release authorization gates. Align active scope/ADR/UX/hosting notes with HAPI reuse and targeted `hapi_app` privileges, fresh public realm/accounts and a separate legacy Keycloak storage transition. Preserve task IDs, change 001 history, bootstrap administrator recovery and the current fixture-only public deployment; approval recording does not authorize live cutover or public deployment.
- [x] 1.2 Record only public origin/callback/issuer, existing upstreams/peers and affected settings; align outdated scope pointers. Verify the packet excludes database/privilege migrations. List concrete activation gates separately; retain privileged UFW inspection as an operational follow-up without repeating broad readiness reviews.

## 2. Bind the existing Keycloak securely

- [x] 2.1 Configure the owned public realm/client HTTPS authority and exact callback without changing legacy issuer/policies. Test real discovery, Code/S256 without PAR and ePA compatibility. Record provider production suitability as a separate activation gate; do not implement a storage migration here.
- [x] 2.2 Configure individual synthetic demo accounts, disabled registration, required password change, audience/permission and five-minute tokens using existing tooling. Verify fresh/repeat/conflict behavior and rejected missing/invalid PKCE; document private credential delivery without importing legacy users.

## 3. Enable the existing production mission

- [x] 3.1 Add minimal standard-only public issuer/origin/cookie/trusted-proxy settings and necessary HAPI issuer/JWKS binding. Test profile isolation, HTTPS/CSRF/validation failures and existing ePA/PAR regressions; change no database settings or HAPI security implementation.
- [x] 3.2 Add the explicit OAuth-enabled production SPA/Nginx target, keeping default fixtures and private development mode. Verify production assets, origin/default-off guards, existing adapter/session restoration, both locales and focused visual/accessibility regressions; include no browser secrets or UI redesign.

## 4. Connect Nginx and prepare targeted replacement

- [x] 4.1 Proxy the six declared BFF operations and required public-realm login/OIDC/assets. Test methods, encoded/alternate routes, private admin/ePA/FHIR denial, trusted headers, independent logout limits, cache isolation and secret-safe upstream failures using actual proxy configuration.
- [x] 4.2 Prepare only necessary existing SPA/BFF/Keycloak/HAPI binding and project-route changes, preserving the working Tunnel/Traefik infrastructure. Validate merged configuration and connectivity from candidate Nginx and HAPI, including HTTPS discovery/JWKS; document exact service/settings diffs and preserve live fixtures/data during staging.
- [x] 4.3 Save the current fixture image/configuration and necessary previous standard/HAPI settings. Document and rehearse exact targeted apply/withdraw/rollback commands; verify fixture navigation, ePA/PAR and data preservation. Require no shared-stack shutdown, database restore, volume reset or migration tooling.

## 5. Verify integration and deliver the release packet

- [x] 5.1 Run focused NestJS, SPA build/typecheck/browser/accessibility, HAPI trust/security integration and proxy tests relevant to changed bindings. Reuse change 001 evidence, check production advisories/disclosure, and run lint/format and strict OpenSpec validation; record failures without unrelated upgrades or broad infrastructure testing.
- [x] 5.2 Verify the staged real login/return/refresh/read/Inspector/CSRF logout/old-auth/history journey and new auth-path negatives. Deliver exact images, settings, gate results, test evidence and targeted rollout/rollback commands for owner review. Identify unresolved activation gates; do not label staged success as public acceptance.

### Authorized preparation — resolve the Keycloak production prerequisite

- [ ] 5.3 After explicit preparation authorization, inspect only the pinned Keycloak/PostgreSQL compatibility, current provider binding/state and available consistent backup needed for the transition. Prepare the production startup/private proxy model, idempotent `keycloak`/`keycloak_app` provisioning, bounded connection settings, exact isolated-target names and targeted recovery plan. Resolve source-consistency, grants and maintenance/session/revocation open decisions; obtain specific approval before any shared-instance DDL or live backup pause. Preserve HAPI and avoid broad readiness work.
- [ ] 5.4 After the required preparation/operational approvals, rehearse only on isolated Keycloak copies and approved disposable Keycloak databases/roles in the existing PostgreSQL 16 instance; create no additional PostgreSQL container or volume. Verify production readiness/restart, least privilege and no HAPI data access, preservation of users/credential behavior/signing keys/clients/issuer/PAR, real standard OAuth and ePA regressions, disclosure protection and targeted provider recovery. Keep live provider data, public fixtures and HAPI unchanged; report preservation/isolation blockers instead of resetting state or weakening security.
- [ ] 5.5 Record the prerequisite evidence and refresh the release packet with exact current source/image identities, production settings, preserved-state comparisons, maintenance/session/revocation decisions, approval boundaries and tested provider/SPA cutover/withdrawal commands. Revalidate Compose, relevant integration/security checks and strict OpenSpec; keep the provider gate open wherever evidence or approval is missing. Preserve prior task/evidence history. Do not perform live cutover or public activation during preparation.

## 6. Release only after separate approval

These tasks remain unapproved. Close actual public-authentication gates before activation;
do not infer release approval from prior preparation authorization or planning completion.

- [ ] 6.1 After explicit approval of the exact tested packet and any Keycloak maintenance/database provisioning, perform only its reviewed Keycloak production cutover privately and verify provider gate closure before targeting the public SPA replacement and necessary binding settings. Preserve existing services/data and private ePA; verify readiness and execute the appropriate targeted provider recovery or SPA withdrawal on failure. Public activation remains blocked until all its gates pass.
- [ ] 6.2 Verify the complete actual public HTTPS browser journey, proxy/security negatives and ePA/PAR after cutover. Confirm private HAPI/admin boundaries and safe observations; record public acceptance or restore the fixture release. Do not claim provider-internal observations or archive this change.
