# Tasks

**Preparation tasks 1.1–5.2 are APPROVED; public release is NOT APPROVED.** The owner renewed
the apply request after the planning simplification. Live ownership/credential changes and
tasks 6.1/6.2 require separate authorization. See the
[approval and verification record](repository-verification.md#preparation-authorization).
Follow the [design](design.md) and
[acceptance specification](specs/public-playground-runtime/spec.md). Preserve change 001's
completed tasks and historical evidence; do not archive it as part of this work.

## 1. Confirm release scope and operating prerequisites

- [x] 1.1 Record the existing preparation approval for tasks 1.1–5.2 and the separate live-database/public-release authorization gates. Align active scope/ADR/UX/hosting notes with HAPI reuse and targeted `hapi_app` privileges, fresh public realm/accounts and a separate legacy Keycloak storage transition. Preserve task IDs, change 001 history, bootstrap administrator recovery and the current fixture-only public deployment; approval recording does not authorize live cutover or public deployment.
- [ ] 1.2 Record actual Tunnel/peer values and existing PostgreSQL container/volume/image identity. Recheck bootstrap recovery, HAPI ownership/extensions/grants and credential consumers; review exact privilege/access deltas without planning HAPI data movement. Measure combined pools/CPU/RAM/disk/WAL/I/O, backup headroom and shared-failure implications. Identify a consistent legacy dev-file source copy or a separately approved backup window. Set recovery objectives, monitoring ownership/scheduler/alerts; obtain privileged UFW and external direct-origin evidence. Stop on unknown dependencies or insufficient capacity.

## 2. Prepare production provider and isolated public realm

Dependency: approved scope. Use isolated copies until the cutover task.

- [ ] 2.1 Prepare a short project-specific PostgreSQL privilege/provisioning procedure and the pinned Keycloak offline CLI transfer. Rehearse `hapi_app` owner/grant/credential changes on an isolated representative synthetic schema, with no HAPI dataset migration or generic migration engine. Verify repeat/conflict/partial-failure behavior, restricted startup/own-schema DDL, real cross-database/admin denial, bootstrap recovery and recorded reversal. Decouple runtime secrets in canonical configuration/env initialization without live changes. Separately rehearse legacy dev-file export/import into guarded PostgreSQL targets; preserve ePA realm/users/signing keys/clients/credentials/PAR and prove actual signatures and header/browser regressions. Verify ordinary independent database backups/restores and retained-volume rollback; no extra PostgreSQL container.
- [ ] 2.2 Provision `playground-public`, its owned client/scopes, fresh keys/secret and new individual synthetic accounts from scratch using existing Keycloak tooling. Do not import existing demo users or private realm/history. Test fresh setup, repeat/no-op and conflict refusal, HTTPS metadata, Code/S256 without PAR, missing/invalid PKCE, five-minute tokens, disabled registration and required password change. Document private credential delivery/reset/deactivation and unchanged legacy ePA issuer/policies.

## 3. Extend the existing application binding

- [ ] 3.1 Add standard-only issuer configuration with legacy fallback and explicit fail-closed public HTTPS/proxy validation. Reuse transaction/session/token modules. Add focused configuration, spoofing, signed-token, profile-substitution, cookie/CSRF, replay/race/expiry and full/failed-event-storage cleanup regressions; verify existing unit/ePA tests and document the new settings without exposing values.
- [ ] 3.2 Add the explicit production OAuth build/Nginx target and public mission availability/recovery copy while preserving the fixture target and existing mission adapter/renderer. Test default-off and public opt-in, no secret/browser persistence, normal login navigation, typed 429 recovery including top-level navigation, fixture/conceptual ePA and DE/EN key parity. Document public versus private build commands and verify existing visual/capability/accessibility behavior.

## 4. Make project ingress and host operation reproducible

- [ ] 4.1 Add reviewed project-scoped Nginx/Traefik/Tunnel policy sources and deployment commands for narrow API/provider routes, exact methods, trusted peers, cache/header rules, independent rate/cleanup budgets and safe diagnostics. Validate configuration and exercise actual proxy containers with forged headers, encoded/alternate paths, admin/legacy/FHIR denial, cache isolation, throttling and secret-sentinel upstream failures; document the route/trust/logging allowlists and any unavailable edge controls.
- [ ] 4.2 Correct HAPI issuer/JWKS, loopback BFF reachability, memory/heap and conflict-safe initialization in the canonical host/Yoster lifecycle while retaining the existing HAPI database/data. Bind restricted runtime accounts and production Keycloak PostgreSQL storage in the staged configuration. Validate application recreation, JWKS, 200/401/403 and seed repeat/conflict behavior; ensure fresh public setup and unchanged legacy ePA. Verify provisioning order, no bootstrap secret in applications and no new PostgreSQL service/volume/port; preserve bootstrap identity/password/system ownership without restarting shared PostgreSQL.
- [ ] 4.3 Version short guarded SQL/CLI procedures, monitoring, ordinary per-database backup/recovery and targeted withdrawal/reapply commands in existing operations. Record exact created resources/owner/ACL/HBA/config deltas; add no migration framework, resumable engine or data transformations. Test admin recovery, separate restores, fixture recovery, privilege reversal and legacy provider rollback before writes resume. Provider/public rollback retains successful restricted HAPI access; never restore HAPI data, replay global roles, replace/restart shared PostgreSQL or fall back to application superuser credentials.

## 5. Complete staged acceptance and release evidence

- [ ] 5.1 Run combined NestJS unit/real integration, HAPI Gradle/security/JPA, SPA TypeScript/build/browser/architecture/localization/accessibility, lint/format and strict OpenSpec checks. Map scenarios to evidence: targeted HAPI privileges and retained data, fresh public accounts, preserved legacy ePA identities/signatures/PAR, cross-database/admin negatives, repeat/conflict handling, ordinary restore assurance, observer truth, ownership/caching/cleanup and rollback. Run scoped production advisory checks, retaining development findings separately; block unresolved production findings without unrelated upgrades.
- [ ] 5.2 Reproduce from a fresh recursive checkout; rehearse startup/restart, mixed-load/connection pressure, authorized shared-outage recovery, targeted privilege reversal and both public/provider rollback stages. Verify one ordinary guarded restore per database with explicit rehearsal-role mappings; no HAPI data-migration restore matrix. Prove legacy Keycloak preservation from a consistent source copy and fresh public provisioning independently. Compare DE/EN/native-zoom screenshots. Deliver exact images/configurations, protected backups, concise change records, restore/monitoring results and the release packet; distinguish staged from public evidence and retain failures/skips.

## 6. Perform only the authorized targeted public rollout

Dependency: all preceding gates pass and public deployment authorization is recorded. Reuse
existing authorization when it explicitly covers this exact packet; do not infer it from
planning completion or apply tooling status.

- [ ] 6.1 After separate live ownership/credential and public-release approval, recheck privilege/legacy-preservation evidence, shared-instance capacity, verified backups and ingress/firewall/logging guards. Apply the rehearsed HAPI privilege transition in place without data copy/restore/conversion. Perform the legacy Keycloak offline storage transfer in its approved write-freeze window, verify ePA identities/keys/PAR, then provision the public realm/accounts fresh. Preserve bootstrap/system ownership, current database data and volumes. Deploy only reviewed public application/SPA changes and withdraw private Vite; on failure use recorded targeted recovery without database reset/recreation or application superuser fallback.
- [ ] 6.2 Verify the actual public DNS/HTTPS/Tunnel/Traefik/Nginx browser journey through real Keycloak and HAPI: login, fixed return, same-run refresh, synthetic read, Inspector provenance, CSRF logout, old-authentication denial and owned history. Run public spoof/bypass/cache/rate/security negatives, external port isolation, ePA regressions, restart/recovery and monitoring checks. Promote verified demo availability only on full pass; otherwise execute the targeted rollback and verify fixture-only public behavior, private ePA and preserved data. Record requirement-to-test evidence and remaining operational findings honestly.
