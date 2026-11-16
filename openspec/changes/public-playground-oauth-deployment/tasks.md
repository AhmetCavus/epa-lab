# Tasks

**APPROVED narrowed preparation, 2026-11-14 — no live deployment.** Preparation approval
remains bounded to 1.1–5.2; public rollout tasks 6.1/6.2 still require separate approval.
Follow the narrowed [proposal](proposal.md), [design](design.md) and [specification](specs/public-playground-runtime/spec.md).

**Final owner decision, 2026-11-16:** retain existing Keycloak H2 `dev-file` and development
startup for the experimental public beta. The earlier explicit apply authorized preparation
5.3–5.5; those tasks are narrowed below to the 26.8.0 → 26.8.2 security upgrade, consistent
H2 backup and tested rollback. Remove all Keycloak PostgreSQL migration/provisioning/role
and storage-transition work. This request updates planning only: no live service changes,
backup pause, deployment or public activation. Specific live maintenance and release
approvals remain separate; 5.3–5.5 and 6.1/6.2 remain unchecked.

All 16 task IDs and checkbox states are retained: **11/16 complete**. The 11 completed
descriptions below are preserved verbatim as dated history. Task 1.1's database/privilege/
storage references and task 2.1's production-suitability gate are superseded by the final
H2 beta decision, not instructions to revive that work. Keep historical
[verification](repository-verification.md), completed [preparation evidence](preparation-verification.md),
existing public SPA/BFF candidates and change 001 unchanged. The migration proposals in
[earlier execution evidence](keycloak-production-verification.md) and [release packet](release-packet.md)
are superseded; their actual observations/image identities remain evidence. Refresh the
packet under 5.5 after the new tests, without claiming they have run. The isolated 403 is
not an outage prerequisite; HAPI availability is a separate issue, not a Keycloak preparation
dependency, and its PostgreSQL configuration must remain untouched.

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

### Focused preparation — retained H2 beta security upgrade

- [ ] 5.3 Pin the exact 26.8.2 image digest and review only 26.8.0 → 26.8.2 compatibility/security changes. Record the retained `epa-lab-keycloak` service, H2 volume/data, source image/settings and a consistent cold-backup/restore plan. Verify an administrator-supplied backup or obtain specific approval before a bounded Keycloak-only backup pause; document integrity, isolated targets and maintenance/session/token impact. No live upgrade, storage transition or HAPI PostgreSQL work.
- [ ] 5.4 On isolated copies of the verified H2 backup, test the 26.8.0 baseline, 26.8.2 upgrade/restart and rollback using the saved 26.8.0 image with freshly restored pre-upgrade state. Verify realm/user/credential/key/client preservation, administrative recovery, real ePA/PAR and standard OAuth/HTTPS/proxy/session regressions. Keep the live volume and services untouched; never downgrade upgraded files or conceal missing state with fixtures/resets. Record actual results; handle HAPI availability separately.
- [ ] 5.5 Refresh the release packet with the exact provider digests, backup/restore evidence, targeted commands and maintenance/session/revocation/post-upgrade-write decisions while preserving existing SPA/BFF candidate and fixture rollback identities. Document experimental beta, unsupported production H2/startup risk, owner-provisioned demo accounts, synthetic-only data and no production-readiness claim. Run focused configuration/security checks and strict OpenSpec validation; list only concrete remaining blockers. No live deployment or public activation.

## 6. Release only after separate approval

These tasks remain unapproved. Close actual public-authentication gates before activation;
do not infer release approval from prior preparation authorization or planning completion.

- [ ] 6.1 After separate approval of the exact tested beta packet and bounded Keycloak maintenance, apply only the reviewed 26.8.2 image update to the existing Keycloak service with its retained H2 volume/data and verify provider recovery/compatibility before the public SPA replacement and necessary binding settings. Preserve existing services/data and private ePA; use the tested H2/image restore or independent fixture withdrawal on failure. Activate public OAuth only when the concrete gates and explicit release approval permit it; make no production-readiness claim.
- [ ] 6.2 Verify the complete actual public HTTPS browser journey, proxy/security negatives and ePA/PAR after cutover. Confirm private HAPI/admin boundaries and safe observations; record public acceptance or restore the fixture release. Do not claim provider-internal observations or archive this change.
