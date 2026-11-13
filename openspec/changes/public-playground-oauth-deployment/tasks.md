# Tasks

**DRAFT — all tasks unstarted.** Planning artifacts do not authorize public implementation
or deployment. Follow the [design](design.md) and
[acceptance specification](specs/public-playground-runtime/spec.md). Preserve change 001's
completed tasks and historical evidence; do not archive it as part of this work.

## 1. Confirm release scope and operating prerequisites

- [ ] 1.1 Record implementation/public-release approval for this DRAFT change using the owner's revised architecture: existing PostgreSQL 16 container/volume, unchanged `hapi`, and separate `keycloak` database/role/credentials. Resolve documented B1 (existing HAPI superuser) explicitly without silently changing HAPI permissions or claiming mutual isolation. The architecture correction alone authorizes no implementation. Align active authorization/ADR/UX/hosting notes without rewriting change 001; verify approval and unchanged historical task tracking.
- [ ] 1.2 Record actual Tunnel/peer values, existing PostgreSQL container/volume/image identity, HAPI credential-success/schema/ACL baseline, actual pools/connections, combined CPU/RAM/disk/WAL/I/O and backup/restore headroom, per-database recovery objectives and joint maintenance implications. Set monitoring ownership/scheduler/alerts; obtain privileged UFW evidence and external direct-origin checks. Verify the values support bounded provider settings without implicit HAPI/global database changes or wider ingress.

## 2. Prepare production provider and isolated public realm

Dependency: approved scope. Use isolated copies until the cutover task.

- [ ] 2.1 Prepare production Keycloak to connect privately to the existing `res-server-db:5432/keycloak`, with a separate secret and no new PostgreSQL service/volume. Add journaled, serialized provisioning of only missing owned database/role resources, minimum privileges and new-role-only private access restrictions. Test repeat/no-op, interruption, conflicting ownership/credentials, real own/other-database connections and retained-data rollback. Define separate `hapi`/`keycloak` custom-format backups, protected role metadata and guarded empty-target restore tests; verify HAPI data/schema/ACL/credentials and the original container/volume remain intact. Rehearse provider migration from a consistent copy, key/user/client/policy preservation and real private ePA/PAR; document recovery without shared-server/volume reset.
- [ ] 2.2 Add the public realm/client/scopes and idempotent owned migration/provisioning procedure, reusing existing Keycloak tooling. Test fresh setup, repeated migration/conflict rejection, canonical HTTPS metadata, Code/S256 without PAR, missing/invalid PKCE, five-minute tokens, individual demo access/disabled registration and required password change. Document private credential delivery, reset/deactivation and unchanged ePA issuer/policies.

## 3. Extend the existing application binding

- [ ] 3.1 Add standard-only issuer configuration with legacy fallback and explicit fail-closed public HTTPS/proxy validation. Reuse transaction/session/token modules. Add focused configuration, spoofing, signed-token, profile-substitution, cookie/CSRF, replay/race/expiry and full/failed-event-storage cleanup regressions; verify existing unit/ePA tests and document the new settings without exposing values.
- [ ] 3.2 Add the explicit production OAuth build/Nginx target and public mission availability/recovery copy while preserving the fixture target and existing mission adapter/renderer. Test default-off and public opt-in, no secret/browser persistence, normal login navigation, typed 429 recovery including top-level navigation, fixture/conceptual ePA and DE/EN key parity. Document public versus private build commands and verify existing visual/capability/accessibility behavior.

## 4. Make project ingress and host operation reproducible

- [ ] 4.1 Add reviewed project-scoped Nginx/Traefik/Tunnel policy sources and deployment commands for narrow API/provider routes, exact methods, trusted peers, cache/header rules, independent rate/cleanup budgets and safe diagnostics. Validate configuration and exercise actual proxy containers with forged headers, encoded/alternate paths, admin/legacy/FHIR denial, cache isolation, throttling and secret-sentinel upstream failures; document the route/trust/logging allowlists and any unavailable edge controls.
- [ ] 4.2 Put HAPI public-issuer/JWKS mapping, loopback-only BFF reachability, memory/heap and conflict-safe seeding in the canonical host/Yoster lifecycle; point Keycloak to its new database on the unchanged private PostgreSQL service. Validate merged configuration and application recreation, real JWKS access, signed-token 200/401/403, private probes and seed idempotence/conflict refusal. Verify no new PostgreSQL service/volume/port, unchanged bootstrap/HAPI settings and correct dependency ordering; document the authoritative lifecycle without requiring a shared-database restart for provider changes.
- [ ] 4.3 Version guarded verification, monitoring, per-database backup/restore and targeted withdrawal/reapply tooling in the existing operations structure. Reuse Yoster/selected scheduler with private credentials and bounded logs. Test independent dump/restore validation, shared-capacity/outage detection, fixture recovery, owned-delta rollback and safe output. Verify provider rollback never restores `hapi`, replays cluster-wide roles or replaces/restarts shared PostgreSQL/volume; document service-specific versus joint-maintenance response.

## 5. Complete staged acceptance and release evidence

- [ ] 5.1 Run combined NestJS unit/real integration, HAPI focused Gradle/security/JPA integration, SPA TypeScript/build/browser/architecture/localization/accessibility, lint/format and strict OpenSpec checks. Map every scenario to actual evidence, including new-role privilege/connection negatives, HAPI preservation, idempotent provisioning, both restores, observer/reporter truth, ownership, caching, cleanup and ePA. Run scoped production advisory checks, retaining development findings separately; block unresolved production findings without unrelated upgrades.
- [ ] 5.2 Reproduce from a fresh recursive checkout and rehearse application startup/restart, mixed-load/connection exhaustion, approved joint database outage/recovery and both targeted rollback stages. Fully restore each database backup into guarded verification targets on the existing instance with sufficient headroom; verify credential/owner/ACL/key/data fingerprints and unaffected live databases. Compare DE/EN/native-zoom screenshots. Deliver exact image/configuration/backup/journal/monitoring/restore evidence; distinguish staged from public results and retain failures/skips.

## 6. Perform only the authorized targeted public rollout

Dependency: all preceding gates pass and public deployment authorization is recorded. Reuse
existing authorization when it explicitly covers this exact packet; do not infer it from
planning completion or apply tooling status.

- [ ] 6.1 Recheck approval/B1 resolution, shared-instance identities/capacity, separate verified backups, provisioning ownership and firewall/peer/logging guards. In the authorized provider maintenance window provision/verify only `keycloak` resources and migrate without changing `hapi`, PostgreSQL bootstrap settings or the existing volume/container. Verify private ePA first, then target reviewed application/SPA changes and withdraw private Vite. Record exact results and only approved public routes; stop on preservation/privilege/capacity failures rather than resetting or recreating shared PostgreSQL.
- [ ] 6.2 Verify the actual public DNS/HTTPS/Tunnel/Traefik/Nginx browser journey through real Keycloak and HAPI: login, fixed return, same-run refresh, synthetic read, Inspector provenance, CSRF logout, old-authentication denial and owned history. Run public spoof/bypass/cache/rate/security negatives, external port isolation, ePA regressions, restart/recovery and monitoring checks. Promote verified demo availability only on full pass; otherwise execute the targeted rollback and verify fixture-only public behavior, private ePA and preserved data. Record requirement-to-test evidence and remaining operational findings honestly.
