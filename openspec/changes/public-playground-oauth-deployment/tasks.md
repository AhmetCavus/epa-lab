# Tasks

**Live public replacement verified, 2026-11-16.** The owner approved 6.1/6.2 and
requested replacing the fixture site in place. The fresh production provider, private
acceptance, complete actual HTTPS browser/resource journey and security/accessibility
checks pass. Yoster now uses the permanent live profile. Task 6.1 is checked; task 6.2
retains only the owner acceptance record. **15/16 tasks complete.** See
[live verification and preserved state](live-release-verification.md). Earlier dated
preparation-only statements below are history superseded by the release grant.

**APPROVED narrowed preparation, 2026-11-14 — no live deployment.** Preparation approval
remains bounded to 1.1–5.2; public rollout tasks 6.1/6.2 still require separate approval.
Follow the narrowed [proposal](proposal.md), [design](design.md) and [specification](specs/public-playground-runtime/spec.md).

**Final owner architecture decision, 2026-11-16:** use fresh database `keycloak` and
least-privilege `keycloak_app` on the existing PostgreSQL 16 instance, with patched
production-mode 26.8.2 in the existing `epa-lab-keycloak` service. Provision `epa-demo`,
`playground-public` and fresh synthetic users from versioned configuration. No H2 migration.
Preserve the original H2 volume offline for recovery until the fresh installation is accepted.

**Preparation resumed by owner apply, 2026-11-16:** preparation 5.3–5.5 is authorized.
The owner accepts recreated users, regenerated keys, invalidated sessions and incompatible
old tokens/credentials; no H2 migration. The owner subsequently approved the exact
PostgreSQL restart/read-only postchecks; recovery and 5.3 are complete. New database/role/
schema creation subsequently received explicit owner approval and is now provisioned;
isolated production-mode fresh-flow/restart verification passes and 5.4 is complete. Live
Keycloak replacement/public activation remain excluded. See the
[current preparation record](fresh-keycloak-preparation.md); 5.5 has closed the release
packet and final checks, while 6.1/6.2 remain unapproved.

All 16 task IDs are retained: **15/16 complete**. The original 11 completed
descriptions below are preserved verbatim as dated history. Their earlier preservation,
storage exclusions and successful tests do not assert continuity of old Keycloak identities
or acceptance of this fresh installation. HAPI privilege/data work and legacy migration
remain excluded. Keep historical
[verification](repository-verification.md), completed [preparation evidence](preparation-verification.md),
existing public SPA/BFF candidates and change 001 unchanged. The migration proposals in
[earlier execution evidence](keycloak-production-verification.md) and [release packet](release-packet.md)
and the earlier retained-H2 beta plan are superseded; their actual observations/image
identities remain dated evidence. Tasks 5.3–5.5 record the additional verified preparation
and completed packet after actual fresh-install tests. The isolated 403 is not an
outage prerequisite. Existing PostgreSQL availability is now a prerequisite for the fresh
Keycloak database; restore it through a targeted approved operation while keeping HAPI's
database/data and PostgreSQL configuration untouched. No H2 export/import, data transfer
or legacy-data migration rehearsal is required.

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

### Focused preparation — fresh PostgreSQL Keycloak, no H2 migration

- [x] 5.3 Diagnose and restore existing PostgreSQL 16 availability through a specifically approved targeted operation that preserves HAPI database/data/configuration; verify private TCP, SQL and HAPI connectivity. Prepare exact fresh `keycloak`/least-privilege `keycloak_app` provisioning with conflict/effective-access checks. Record owner confirmation of regenerated users/signing keys and client/session/token/cache consequences before live provider replacement. No reset, shared-volume replacement or inferred live-repair/DDL approval.
- [x] 5.4 After recovery and specific provisioning approval, create the fresh `keycloak` database/role on the existing instance and verify least privilege with no HAPI data access. Pin 26.8.2 and test an isolated production-mode candidate using versioned `epa-demo`/`playground-public` configuration and fresh synthetic users. Verify repeat/conflict/restart, administrative access, real fresh ePA/PAR and OAuth/HTTPS/session/logout/resource behavior. No existing provider replacement, H2 import/data transfer, migration rehearsal or HAPI data change.
- [x] 5.5 Refresh the packet with exact provider/database/realm settings, image identities, fresh-flow evidence and confirmed identity-reset/token handling. Document the approved handoff's offline original-H2 retention with matching recovery image/settings until acceptance, plus targeted provider recovery and independent fixture withdrawal. Preserve SPA/BFF candidate identities; verify focused configuration/security checks and strict OpenSpec. Retain experimental beta, owner-provisioned synthetic accounts and no production-readiness claim. No live cutover/public activation.

## 6. Release only after separate approval

The owner explicitly approved these tasks on 2026-11-16. Handoff and all technical
acceptance pass; the owner trial/acceptance record is the sole remaining part of 6.2.
Original H2 remains retained offline. Earlier stopped attempts and targeted recovery are
preserved in the release evidence.

- [x] 6.1 After separate approval of the exact tested packet, confirmed identity-reset consequences and bounded maintenance, point the existing `epa-lab-keycloak` service at the fresh PostgreSQL installation using production-mode 26.8.2. Retain the original H2 volume offline with its recovery image/settings; perform no H2 transfer or HAPI/shared-storage reset. Verify private fresh ePA/PAR/OAuth before reviewed application/binding changes and any explicitly approved public activation; restore fixture-only access or use approved private-provider recovery on failure.
- [ ] 6.2 Verify the full actual public HTTPS browser/resource journey, proxy/security negatives, fresh ePA/PAR and old-authentication rejection with reviewed token/cache handling. Confirm HAPI data/private-admin boundaries and safe observations; record owner acceptance of the new installation or restore fixture-only behavior. Retain original H2 for recovery until acceptance; do not delete it without a separate owner decision. Do not claim provider internals, production readiness or archive this change.
