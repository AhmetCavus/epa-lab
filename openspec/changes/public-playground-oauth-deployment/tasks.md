# Tasks

**DRAFT — all tasks unstarted.** Planning artifacts do not authorize public implementation
or deployment. Follow the [design](design.md) and
[acceptance specification](specs/public-playground-runtime/spec.md). Preserve change 001's
completed tasks and historical evidence; do not archive it as part of this work.

## 1. Confirm release scope and operating prerequisites

- [ ] 1.1 Record explicit owner approval of this public change, including the owner-selected dedicated Keycloak PostgreSQL container/volume, demo realm, maintenance/reauthentication boundary and exact permitted hosting changes. The database selection alone does not authorize implementation. Align active authorization/ADR/UX/hosting notes without rewriting change 001; verify the approval record and unchanged historical task tracking.
- [ ] 1.2 Record the actual Tunnel connector/ingress, exact trusted peers and recreation procedure, host capacity/budgets, monitoring owner/scheduler/alert destination and maintenance window. Obtain independent privileged UFW ordering/duplicate/default-policy/backup-integrity evidence and external direct-origin checks; verify these concrete values support the design without broadening shared ingress or firewall policy.

## 2. Prepare production provider and isolated public realm

Dependency: approved scope. Use isolated copies until the cutover task.

- [ ] 2.1 Add production Keycloak and its dedicated unpublished PostgreSQL container/volume configuration plus protected snapshot/export/import/recovery tooling. Rehearse from a consistent copy; verify provider storage restart/restore leaves HAPI's database service/data/volume unchanged, existing user/credential/client/key/policy preservation, old session/code/refresh handling and real private ePA/PAR behavior. Document downtime and both recovery boundaries. Stop on incompatible state preservation; never reset the original volume or import over the live realm.
- [ ] 2.2 Add the public realm/client/scopes and idempotent owned migration/provisioning procedure, reusing existing Keycloak tooling. Test fresh setup, repeated migration/conflict rejection, canonical HTTPS metadata, Code/S256 without PAR, missing/invalid PKCE, five-minute tokens, individual demo access/disabled registration and required password change. Document private credential delivery, reset/deactivation and unchanged ePA issuer/policies.

## 3. Extend the existing application binding

- [ ] 3.1 Add standard-only issuer configuration with legacy fallback and explicit fail-closed public HTTPS/proxy validation. Reuse transaction/session/token modules. Add focused configuration, spoofing, signed-token, profile-substitution, cookie/CSRF, replay/race/expiry and full/failed-event-storage cleanup regressions; verify existing unit/ePA tests and document the new settings without exposing values.
- [ ] 3.2 Add the explicit production OAuth build/Nginx target and public mission availability/recovery copy while preserving the fixture target and existing mission adapter/renderer. Test default-off and public opt-in, no secret/browser persistence, normal login navigation, typed 429 recovery including top-level navigation, fixture/conceptual ePA and DE/EN key parity. Document public versus private build commands and verify existing visual/capability/accessibility behavior.

## 4. Make project ingress and host operation reproducible

- [ ] 4.1 Add reviewed project-scoped Nginx/Traefik/Tunnel policy sources and deployment commands for narrow API/provider routes, exact methods, trusted peers, cache/header rules, independent rate/cleanup budgets and safe diagnostics. Validate configuration and exercise actual proxy containers with forged headers, encoded/alternate paths, admin/legacy/FHIR denial, cache isolation, throttling and secret-sentinel upstream failures; document the route/trust/logging allowlists and any unavailable edge controls.
- [ ] 4.2 Put HAPI public-issuer/JWKS mapping, loopback-only BFF reachability, memory/heap and deliberate conflict-safe seeding in the canonical host/Yoster lifecycle. Validate merged Compose and ordinary recreation with exact image identities, real container JWKS access, signed-token 200/401/403, private data-free probes, seed idempotence/conflict refusal and unchanged PostgreSQL data. Document the authoritative startup/shutdown path so a host-only invocation cannot drop these settings.
- [ ] 4.3 Version the guarded real-runtime verification, monitoring and targeted withdrawal/reapply tooling in the existing test/operations structure. Reuse Yoster and the selected host/CI scheduler, with private credentials and bounded logs. Verify failure detection/threshold routing, fixture-image recovery, backup permissions, safe command output and absence of implicit shared-stack teardown; document operator actions and the two provider recovery stages.

## 5. Complete staged acceptance and release evidence

- [ ] 5.1 Run combined NestJS unit/real integration, HAPI focused Gradle/security/JPA integration, SPA TypeScript/build/browser/architecture/localization/accessibility, lint/format and strict OpenSpec checks. Map every approved scenario to actual evidence, including observer/reporter truth, ownership, caching, CSRF/logout pressure and legacy ePA. Run production package, Java and runtime-image advisory checks; separate development findings and block on unresolved production release findings rather than upgrading unrelated dependencies silently.
- [ ] 5.2 Reproduce from a fresh recursive remote checkout, rehearse production startup/restart and both targeted rollback stages with real provider/resource components, and compare DE/EN screenshots at supported widths and native 100%/200% zoom. Deliver a release packet with immutable images/commits, exact configuration/host diffs, protected backup manifests, verified commands, monitoring parameters and preservation results. Clearly separate staged evidence from public acceptance; retain any failures/skips.

## 6. Perform only the authorized targeted public rollout

Dependency: all preceding gates pass and public deployment authorization is recorded. Reuse
existing authorization when it explicitly covers this exact packet; do not infer it from
planning completion or apply tooling status.

- [ ] 6.1 Recheck image/source identities, capacity, protected backups, firewall/peer/logging prerequisites and data-preservation guards against the authorized packet. Execute the bounded provider maintenance/migration, verify private ePA first, then target only the reviewed BFF/HAPI/production SPA changes and withdraw the obsolete private Vite binding. Enable only the approved public routes; document exact commands/results and keep original data/volumes and unrelated services intact.
- [ ] 6.2 Verify the actual public DNS/HTTPS/Tunnel/Traefik/Nginx browser journey through real Keycloak and HAPI: login, fixed return, same-run refresh, synthetic read, Inspector provenance, CSRF logout, old-authentication denial and owned history. Run public spoof/bypass/cache/rate/security negatives, external port isolation, ePA regressions, restart/recovery and monitoring checks. Promote verified demo availability only on full pass; otherwise execute the targeted rollback and verify fixture-only public behavior, private ePA and preserved data. Record requirement-to-test evidence and remaining operational findings honestly.
