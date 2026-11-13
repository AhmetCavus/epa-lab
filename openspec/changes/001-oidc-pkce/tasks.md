# Change 001 — Integration Tasks

**Status:** APPROVED — LOCAL/PRIVATE IMPLEMENTATION AUTHORIZED

The project owner explicitly approved this complete change on 2026-11-11, accepted ADR-0001/ADR-0002, the reconciled UX/visual baseline, security architecture and revised specifications, and authorized tasks 2–9 for local/private implementation. See the [owner approval record](readiness-review.md#consolidated-owner-approval-summary). This step records approval only; existing auth-client source is a reuse baseline, not evidence that runtime acceptance has passed.

Group 1 contains completed readiness review and the explicit owner approval recorded by task 1.4. Groups 2–9 are authorized for local/private implementation but remain unchecked and unstarted in this approval-recording step. Preserve unrelated work, the public fixture-only deployment, existing ePA/PAR behavior and prior verification history. Real authentication must not be deployed publicly.

## 0. Completed UI Slice 001 history

The fixture-only SPA is implemented in `apps/playground`. These five completed tasks are retained verbatim as historical UI evidence; they do not complete the new runtime work.

- [x] UI-1: Create the isolated browser app and document local run commands and repository boundary.
- [x] UI-2: Implement a statically registered, honestly labeled two-mission catalog with working preview routes and planned availability.
- [x] UI-3: Implement the generic workspace with mission-owned objectives, checkpoints, grouped actors, selection, zoom/fit, and responsive keyboard-accessible layout for both fixtures.
- [x] UI-4: Implement explicitly loaded OAuth fixture samples, a timeline and Safe Evidence inspector with truthful provenance; keep the ePA preview conceptual with no operational results.
- [x] UI-5: Verify the UI slice with type/build checks and browser scenarios, document evidence and adaptations, and keep real OAuth approval/verification pending.

Evidence: [UI verification](../../../apps/playground/verification.md), the implemented design-foundation and architecture changes, and the frontend localization change. Keep its separately deferred owner copy review unchanged.

## 1. Review and explicit implementation authorization

- [x] 1.1 Review this proposal/design and both capability specs against existing Catalog/Workspace visuals and the standard/ePA boundary. Verify the review record covers runnable availability, redirect/return/recovery/logout states, conceptual-only ePA, roles/channels, and the unchanged visual contract; record owner decisions without silently accepting them. Include context-bound pending/in-flight login cancellation, the post-async pre-commit eligibility check, and cleanup independent of event persistence in that review.
- [x] 1.2 Reconcile current architecture/UX documentation with the draft's actual components, route/session contracts, fixed Workspace return, resource authorization, and observer/reporter semantics. Verify `docs/architecture/system-context.md`, the two UX documents, and the proposal/design/specs describe the same boundaries while preserving prior verification records. Use the design's required system-context alignment checklist for the exact API/component mapping and separate standard/ePA flows; documenting those edits alone does not complete this reconciliation task.
- [x] 1.3 Obtain and record review of ADR-0001/ADR-0002, cookie/CSRF and resource policy, safe event contract, and negative acceptance cases. Verify reviewer/date/decision are explicit and Accepted ADR-0003/ADR-0004 remain intact; unresolved first-integration decisions prevent readiness. Verify the focused cancelled-callback, logout-during-exchange/validation, and exhausted-event-storage logout scenarios have explicit observable assertions before readiness can be accepted.
- [x] 1.4 Obtain explicit owner approval of this complete change and authorization to implement the local/private scope. Verify readiness/acceptance is recorded and the change is deliberately marked APPROVED before starting group 2; planning-file confirmations and CLI artifact status are insufficient.

Readiness and approval: [review evidence and consolidated owner decision](readiness-review.md), 2026-11-11. Codex recorded the tasks 1.1–1.3 review; the project owner subsequently accepted ADR-0001/ADR-0002, the reconciled UX/visual baseline, security architecture and revised specs, and approved local/private implementation under task 1.4. This documentation work starts no task in groups 2–9 and authorizes no public authentication deployment.

## 2. Verify repository ownership and repair local integration wiring

Dependency: group 1 approval. Reuse the existing repositories and services; do not start another BFF or Resource Server.

Evidence: [repository baseline and path-repair verification](repository-verification.md) and [active documentation validation](documentation-verification.md). Tasks 2.1–2.6 are complete. Task 2.5 verified the narrowly authorized health prerequisite, 46 focused tests, canonical build, private connectivity, loopback publication and isolated lifecycle while preserving existing services/volumes/routing. Task 2.6 aligns active paths, links, command references and implementation status; historical reports are unchanged. Tasks 6.1 and 6.4 remain unchecked. The task 2.6 session stopped before group 3; subsequent Keycloak evidence follows below.

- [x] 2.1 Record the implementation baseline and known breakages before source changes. Inspect both reference PNGs in `docs/design/assets`, capture fixture UI/style/artwork baselines, and run the applicable current auth-client/UI/HAPI checks. Verify the record identifies actual paths/versions, existing failures or unavailable checks, and the root/nested working-tree state without changing unrelated work.
- [x] 2.2 Canonicalize the HAPI submodule at `services/res-server` after checking both HAPI worktrees for commits, tracked edits, and untracked work. Preserve unique work before removing the duplicate parent gitlink and reconciling mappings; verify `git ls-files --stage`, `.gitmodules`, targeted submodule status, and a clean recursive checkout resolve one canonical HAPI pointer without losing history.
- [x] 2.3 Repair the Node tooling and lockfile references to the absent `services/epa-authorization` path, including root lint and ESLint project configuration. Retain the existing package identity unless a verified repair needs a rename; verify frozen installation, backend typecheck/build/tests, and lint resolve `services/auth-client`, and update the relevant command documentation.
- [x] 2.4 Repair auth-client Dockerfile copy/build/runtime paths and the root Compose build reference. Verify Compose with `config --quiet`, build the existing backend service, and check readiness without printing secrets; preserve compatible service/image labels and document the corrected commands.
- [x] 2.5 Wire the canonical HAPI/its existing database into a local/private integration profile with a non-conflicting host port and a BFF-reachable address. Reuse the existing Compose/Docker assets and preserve the Keycloak volume and static playground stack; verify backend/provider/resource connectivity, loopback/private exposure, health checks, and documented local startup/shutdown without a volume reset.
- [x] 2.6 Repair current README/EPA/architecture/specification links and run commands affected by the path moves. Verify active links resolve and commands name real files/services; distinguish stable package/service/protocol actor IDs from stale filesystem paths, and leave historical reports unchanged.

## 3. Add an isolated standard Keycloak client

Dependency: corrected local tooling/wiring. The existing ePA client and PAR policy remain regression baselines.

Evidence: [standard client configuration, migration and verification](keycloak-verification.md). Tasks 3.1–3.3 passed fresh-import, existing-realm and live private-realm checks: 81 protocol checks, repeated/no-op migration, scoped rollback and preservation; the existing six ePA integration tests passed before and after migration. Client credentials remain server-side. All 45 original containers/volumes/networks and public routing are preserved. That session stopped after task 3.3; subsequent internal profile implementation is recorded below. Mission browser/UI integration and HAPI authorization remain pending.

- [x] 3.1 Add confidential client `playground-oidc` in the existing realm with exact mission callback, S256 enforcement, and only Authorization Code flow. Add its secret/environment setup and document the separate profile; verify missing/plain PKCE is rejected, no secret reaches the SPA, and the client does not acquire the ePA require-PAR marker.
- [x] 3.2 Configure standard Access Token audience `playground-fhir` and permission `demo.fhir.read`, requested with `openid`. Verify the intended Access Token claims, the ID Token's separate client audience, and a valid narrower grant without resource permission using safe assertions; document the exercise's claim policy without logging tokens.
- [x] 3.3 Provide and exercise fresh-realm setup and a repeatable migration for an existing local realm. Verify ordinary standard authorization works without PAR, the ePA client still rejects PAR bypass, and existing ePA configuration/data survive a repeated migration; document migration/rollback without deleting the realm volume.

## 4. Extend the existing client with fixed profile-aware behavior

Dependency: configured clients. Extend existing auth-client modules and preserve their existing tests.

Evidence: [profile implementation and verification](auth-client-profiles-verification.md). Tasks 4.1–4.4 passed: validated disabled/enabled profiles, profile-specific discovery, direct code/S256 versus preserved ePA PAR, stored-context token validation, 266 unit/HTTP tests and 15 real Keycloak integration tests. Compiled startup and actual code expiry were verified without deployment changes. Existing realm/users, 45 containers/volumes/networks, fixture UI, HAPI and public routing are preserved. Stop after task 4.4; no standard browser session/routes or task 5.1 work was started.

- [x] 4.1 Add validated, server-selected standard/ePA profile configuration with separate client credentials/callback settings and explicit local runtime enablement. Verify legacy-only configuration still works, incomplete enabled mission configuration fails safely, and query/header/callback input cannot select credentials or issuer; document the settings and profile boundary.
- [x] 4.2 Make discovery validation appropriate to each profile: standard authorization/token/JWKS support and PAR required only for ePA. Verify no-PAR standard metadata, invalid/untrusted endpoints, safe transport, cache identity, and existing ePA discovery regressions; keep provider endpoints discovered rather than guessed and document the differing prerequisites.
- [x] 4.3 Add direct standard authorization-request construction reusing state/nonce/PKCE generation, while keeping ePA PAR construction. Verify standard requests contain code/S256 and never call PAR, retries use fresh values, and ePA still uses client_id/request_uri with the existing allowlist/header contract; document this finite branch without a generic protocol framework.
- [x] 4.4 Bind exchange credentials, callback URI, issuer, ID Token audience/authorized party, nonce, and signing-key validation to the stored transaction profile. Verify cross-profile rejection and the authorization spec's signature/algorithm/issuer/audience/lifetime/nonce/hash/PKCE/code failure matrix, retaining real cryptographic checks in the focused suite; document the reused validation boundary.

## 5. Implement the standard browser/session lifecycle

Dependency: group 4. These are new mission routes in the existing process; legacy ePA routes remain intact.

Evidence: [standard browser lifecycle verification](browser-lifecycle-verification.md). Tasks 5.1–5.5 pass with 311 unit/HTTP tests and 17 real private Keycloak integration tests. Verification covers bounded ownership/lifetimes, direct PKCE login, correlated one-time callback, minimal restored session, exact-Origin/CSRF logout, discovery/exchange/validation cancellation races and cleanup independent of history recording. Existing ePA/PAR, realm/users, all 45 containers, volumes/networks, HAPI, fixture UI and public routing are preserved. Resource/event APIs and SPA integration remain pending. Stop after task 5.5.

- [x] 5.1 Extend bounded process-local storage for mission browser contexts, pending transactions, and owned runs without a second persistence layer. Verify ten-minute pending expiry, fifteen-minute context/run bounds, 1000-entry collection capacity, cookie/profile isolation, rotation invalidating old IDs, and restart recovery; document the ownership/lifetime model.
- [x] 5.2 Implement `GET /api/oauth/login` as browser navigation using the fixed standard profile and mission-scoped binding/context cookies. Verify fresh run association, HttpOnly/SameSite/Secure/path behavior, rejection of caller-selected return/client settings, and legacy `/login` regressions; document the correct browser entry and canonical application host.
- [x] 5.3 Implement `GET /api/oauth/callback` with one-time correlated completion and clean 303 return to `/missions/oauth-oidc/workspace`. Verify missing/mismatched cookies, wrong host/instance, lost/expired state, provider denial, malformed query, replay/concurrency, and exchange/validation failures; ensure unowned callbacks neither expose nor change another run and document safe recovery.
- [x] 5.4 Implement `GET /api/oauth/session` with minimal authentication/expiry/current-run state and context-bound anti-CSRF material. Verify truthful authenticated/anonymous/expired results, no tokens/raw claims or broad credentialed CORS, no-store behavior, and unchanged ePA `/session` response; document the frontend DTO.
- [x] 5.5 Implement `POST /api/oauth/logout` with exact-Origin and anti-CSRF checks, token removal, old-cookie invalidation, and an unauthenticated rotated viewing context. Verify GET/foreign-Origin/wrong-or-missing-CSRF rejection, original history lifetime, and independent Keycloak SSO behavior; document local logout without token-revocation claims.

## 6. Implement the missing HAPI Resource Server boundary

Dependency: canonical submodule and client claim policy. Change only `services/res-server`; its current security declaration is not a verified implementation.

Scoped prerequisite evidence, 2026-11-12: the owner authorized only correcting/resolving the Spring Boot 3.5 Resource Server starter and verifying compilation ahead of task 2.5. Those checks passed; task 6.1 remains incomplete because property binding, security activation, focused security-test support and issuer/audience configuration acceptance remain pending. The resumed startup also exposed an existing YAML syntax error. See [repository verification](repository-verification.md).

Completion evidence: [private Resource Server verification](resource-server-verification.md). Tasks 6.1–6.6 pass with 122 focused Gradle tests, 62 real HAPI integration cases and repeated 107-assertion real Keycloak checks. Trusted JWT validation, the exact synthetic read/permission, default-deny alternate operations, health independence, safe reports/logs and idempotent private PostgreSQL seeding are verified. Existing containers/volumes, Keycloak data, auth-client and fixture UI are preserved. The parent pins reviewed HAPI commit `e65bafc279f02f44b19b47ca7326015886047a63`; fresh recursive-checkout compilation, tests and WAR packaging pass with task/build caches disabled. Commits are local; no deployment or task 7 work was performed. Stop after task 6.6.

- [x] 6.1 Verify/correct the pinned Spring resource-server dependencies, property binding, and security activation for the local mission. Add focused security-test support and documented issuer/audience configuration; verify dependency resolution and fail-closed startup/configuration without relying on the placeholder enable flag or unrelated issuer.
- [x] 6.2 Implement inbound bearer validation for trusted signature/algorithm/key, issuer, `playground-fhir` audience, exp/nbf, and Access Token purpose. Verify actual decoder/filter handling with signed test JWTs and trusted test JWKS for missing/malformed/forged/wrong-issuer/wrong-audience/expired/future/ID-Token cases; document the supported token profile and safe failures.
- [x] 6.3 Provide the synthetic R4 `Basic/playground-demo` fixture through local integration/test setup. Verify it contains no patient/clinical content, is reproducibly available to the allowed read, and introduces no anonymous write/seed HTTP endpoint; document its fictional purpose and setup.
- [x] 6.4 Require `demo.fhir.read` for the exact synthetic read and deny undeclared data operations/alternate interfaces. Verify 200 for valid read, 403 without permission or for other reads/writes/search/history/batch/transactions, 401 for invalid credentials, and no MCP/CDS/test-interface bypass; verify only documented data-free health/readiness exceptions and document the narrow policy.
- [x] 6.5 Emit bounded Resource Server decision/reason headers for the allowed read and safe authentication/authorization denials. Verify only the design's enum values appear, status/report agree, and no token, raw exception, claim dump, or body is logged as evidence; document these reports as explicit Resource Server assertions.
- [x] 6.6 Review and record the HAPI repository change and parent submodule pointer through the normal authorized commit workflow. Verify the parent references the reviewed/tested security commit and a fresh recursive checkout reproduces it; document the pinned commit and rollback while preserving unrelated nested work.

## 7. Add BFF resource access and safe run observations

Dependency: standard session lifecycle and the verified local Resource Server boundary.

- [x] 7.1 Implement `GET /api/oauth/resource` for the single configured FHIR read with the server-held standard Access Token and bounded transport/result handling. Verify anonymous/expired/signed-out/ePA-only sessions return 401 without an authenticated upstream call, arbitrary destinations/credentials are refused, and valid/denied/timeout results are safely projected; document the resource DTO and fixed upstream operation.
- [x] 7.2 Define the schema-version-1 discriminated event DTO and per-kind safe evidence allowlists. Verify valid examples, stable event/run IDs and per-run sequence, actual observer/time, actor/channel associations, and rejection of unknown versions/kinds/fields or secret-bearing evidence; document the contract without an arbitrary metadata map or shared infrastructure framework.
- [x] 7.3 Instrument actual authorization, redirect issuance, callback, exchange, session, and resource outcomes at their existing observation boundaries. Verify event order and observer/channel accuracy on success/failure and that unknown/unowned/replayed callbacks do not fabricate observations or mutate another browser's run; document the event-to-observer table and unobservable Keycloak steps.
- [x] 7.4 Validate the Resource Server's explicit bounded decision report and project it inside the BFF-observed resource response. Verify absent/malformed/unknown/conflicting reports produce an unavailable reason, BFF rejection without HAPI contact creates no Resource Server denial, and no internal validation list/timestamp is inferred; document observer versus reporter semantics.
- [x] 7.5 Implement `GET /api/oauth/runs/:runId/events` with independent browser-viewing ownership and bounded retention. Verify two-browser isolation, run-ID-only/old-cookie rejection, stable repeated reads, logout viewing under the original fifteen-minute lifetime, 1000-entry bounds and 100-event rejection before external work; document capacity/restart recovery and prevent silent trace truncation.
- [x] 7.6 Add focused disclosure checks for event/session/resource projection and routine backend/proxy/resource logging. Verify sentinel passwords/codes/verifiers/state/nonce/tokens/secrets/cookies/raw claims/callback queries/full bodies never escape, including unsupported data and upstream failures; document permitted diagnostic fields and disable unsafe raw callback/query logging.

Completion evidence: [BFF resource access and safe observations](resource-observability-verification.md). Tasks 7.1–7.6 pass with 403 unit/HTTP tests, 20 real private Keycloak/HAPI integration tests, typecheck/build/lint, strict OpenSpec and documentation/configuration checks. The fixed synthetic read, owned version-1 event history, actual BFF provenance, strict HAPI reports, capacity/race/cleanup behavior and disclosure protections are verified. All 45 original containers, volumes/networks, Keycloak data, HAPI commit, historical reports, public routing and fixture UI are preserved. Stop after task 7.6; no task 8 implementation.

## 8. Connect the existing SPA without redesign

Dependency: browser API and safe event contract. Apply ADR-0003/ADR-0004 and the inspected visual references.

- [x] 8.1 Extend the neutral protocol-flow contract/rendering for observed events alongside fixtures and unobservable annotations. Verify synchronized actor/path/timeline/Inspector selection, real observer/time/outcome presentation, no provider-internal network arrows, retained fixture behavior, and focused architecture/cycle/public-entry checks; document the narrow new presentation variant without protocol imports in the renderer.
- [x] 8.2 Add the mission-owned API adapter and execution coordination using existing application/domain/data boundaries. Verify schema rejection, literal safe evidence, same-origin requests, absence of bearer/browser persistence, isolated conceptual ePA, and fixture mode without backend calls; document the explicitly enabled runtime binding and keep unverified availability off.
- [x] 8.3 Connect Start authentication, callback return, and refresh to session/run restoration at the existing OAuth Workspace route. Verify normal browser navigation, correct current-run restoration, real pending/recovery states, unknown/expired/restarted context handling, and no protocol replay on viewing; document the browser round trip and fixed return target.
- [x] 8.4 Connect resource access, local Sign out, and Retry while retaining Replay explanation and Reset view semantics. Verify independent authentication/resource outcomes, fresh retry identity, no execution from checkpoint/actor/replay/reset, no false Resource Server denial after BFF rejection, and safe owned-history access after logout; document the action/state behavior in the UX guide.
- [x] 8.5 Add matching German/English semantic resources for runtime actions, outcomes, reasons, and accessibility announcements. Verify key/interpolation parity, German default/fallback, guarded explicit locale persistence, technical values unchanged, and mission/run/fixture/selection/map state retained through language switching; document new keys without localization-runtime imports in domain/data/application.
- [x] 8.6 Compare current fixture and new runtime screens against the recorded visual baseline and both PNG references. Verify artwork/panel hierarchy, readable map Fit/scrolling, keyboard/focus/reduced motion, and both locales at 1366/1024/390/320 CSS pixels plus actual desktop 100%/200% page zoom; record screenshots/a11y results and leave unavailable checks explicitly unverified.

Completion evidence: [Private SPA execution and truthful observations](spa-runtime-verification.md). Tasks 8.1–8.6 pass with 91 browser/contract/architecture/localization/accessibility tests, the focused real private Keycloak/HAPI browser round trip, native 100%/200% zoom in both locales, typecheck/build/lint/format, strict OpenSpec and documentation checks. Private execution is explicitly configured; default/public builds remain fixture-only. All original containers, networks, volumes, Keycloak data, protected files and HAPI commit are preserved. Tasks 9.1–9.5 remain unchecked; no availability promotion. Stop after task 8.6.

## 9. Complete integrated acceptance and evidence

Dependency: all preceding implementation groups. This group checks the combined system; focused tests/documentation belong with the task that introduces each behavior.

- [x] 9.1 Exercise the real browser journey across SPA, auth-client, existing Keycloak, and secured HAPI from a reproducible local checkout. Verify standard login works without a PAR call, returns to Workspace, restores the same run on refresh, permits the synthetic read, and local logout makes the next BFF request fail while eligible history stays inspectable; record only sanitized evidence.
- [x] 9.2 Run the cross-component negative matrix: cookie/state loss, expiry/replay/concurrency, client-profile substitution, provider denial, failed PKCE/token validation, restart recovery, direct HAPI 401/403 cases, cross-browser event access, capacity limits, and logout CSRF. Verify actual observable results against both specs and record failures/skips instead of inferring coverage from successful login.
- [x] 9.3 Re-run real ePA header/PAR and existing browser-demo regressions beside the new standard client, plus the unchanged public fixture configuration. Verify the ePA PAR requirement/contracts, legacy `/session`, conceptual ePA UI, and independent standard behavior all survive; record commands and results without adding the deferred comparison UI.
- [x] 9.4 Run the applicable auth-client typecheck/build/test/integration checks, HAPI Gradle security/integration/build checks, SPA typecheck/build/browser/architecture/localization/format checks, and strict OpenSpec validation. Verify the final scenario-to-evidence map covers the complete accepted scope, logs/artifacts contain no secrets or raw callback capture, and limitations/unavailable checks are explicit.
- [ ] 9.5 Enable runnable availability only for the verified local runtime binding and deliver its dated verification record and rollback instructions. Verify fixture-only builds/public deployment remain honest and unchanged, no public auth ingress was introduced, and implementation/verification status advances only with actual evidence and required owner review.

Initial acceptance evidence (before the approved remediation): [Integrated private acceptance](integrated-acceptance-verification.md). Tasks 9.1–9.3 pass with the fresh local real browser journey, 44 real NestJS/Keycloak/HAPI integration tests, 107 direct Keycloak/HAPI assertions, 122 focused Gradle tests plus 62 real servlet/JPA cases, 91 SPA tests and the actual public fixture-only browser check. Backend Zod is patched from 4.6.5 to 4.6.6. At that stage, task 9.4 remained unchecked because the production dependency audit reported two high and one moderate findings requiring changes beyond the authorized Zod-only update. Task 9.5 is not executed; runnable availability and public routing remain unchanged.

### Task 9.4 remediation scope

**Proposed and owner-approved 2026-11-13; approval recorded before implementation.** The
[limited scope extension](proposal.md#task-94-security-remediation) and
[resolution plan](design.md#task-94-dependency-remediation-plan) apply only to the existing
task 9.4, with no new task ID or change to any acceptance criterion. Approval recording
changed no checkbox; only verified implementation completes task 9.4.

The owner has approved this scope and explicitly requested apply. Resolve transitive production dependencies
to compatible patched versions: `body-parser >=2.4.0`, `multer >=2.5.0`, and `qs >=6.16.1`.
Prefer targeted resolution/lockfile changes and a justified compatible override where
needed. Preserve NestJS and unrelated pins unless a compatible patched resolution of these
three targets demonstrably requires a minimal supporting change; document its necessity
and exact delta. Broader or incompatible changes remain blockers.

Verify the actual production dependency graph, frozen installation and production audit,
rerun the existing task 9.4 acceptance checks, and record fresh evidence without editing
historical reports or waiving other findings/limitations. Approval was recorded at **48/50**,
with task 9.4 unchecked pending implementation and its full original acceptance.
Task 9.5 remains unchecked and outside this extension. Approval is authorization, not evidence
that remediation or verification has passed.

**Subsequent verification, 2026-11-13:** the [remediation evidence](dependency-remediation-verification.md)
records task **9.4 complete**, **49/50** overall. Only `body-parser` 2.4.0, `multer` 2.5.0 and
`qs` 6.16.1 change version; no NestJS or supporting dependency upgrade is needed. Production
audit, the existing quality/security/regression checks and real private integration pass.
The record retains development-tool findings, the remote HAPI checkout limitation, the
initial public-check retry and the deployed HAPI's unchanged missing-JWKS configuration and
automatic lifecycle difference. Task **9.5 remains unchecked and unstarted**; no existing
deployment or public route is changed.

## Workflow follow-up

- After review explicitly authorizes implementation, use `$openspec-apply-change 001-oidc-pkce` to carry the approved plan into code.
- After implementation and verification satisfy the accepted change, request the separate verification/archive workflow as appropriate; do not archive or sync specs during this planning update.
- Public authentication deployment, standard-versus-PAR comparison, durable/distributed storage, SMART on FHIR, and real TI/ePA integration require later scope and authorization.
