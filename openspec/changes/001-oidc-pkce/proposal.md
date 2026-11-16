# Change 001 — First Runnable OAuth/OIDC + PKCE Mission

**Status:** APPROVED — LOCAL/PRIVATE IMPLEMENTATION AUTHORIZED

**Task 9.4 scope extension:** APPROVED — LOCAL/PRIVATE TASK 9.4 ONLY. See the
[dated remediation proposal](#task-94-security-remediation); the existing approval remains intact.

**Planning revision:** 2026-11-11

The project owner approved this complete change on 2026-11-11 and authorized tasks 2–9 for local/private implementation. ADR-0001/ADR-0002, the reconciled UX/visual baseline, security architecture and revised specifications are accepted. See the [owner approval record](readiness-review.md#consolidated-owner-approval-summary). This step records approval only; implementation has not started. Real authentication must not be deployed publicly, and the existing public Playground remains fixture-only.

## Why

Mission Control already exists in `apps/playground`, and `services/auth-client` already implements a local PAR-based browser login demonstration. The missing deliverable is their integration with the existing Keycloak and HAPI FHIR components into a real, securely authorized learning journey with honest evidence.

## What Changes

- Reuse the React SPA in `apps/playground`, the NestJS OAuth/OIDC client in `services/auth-client`, Keycloak under `infrastructure/keycloak`, and the HAPI FHIR Git submodule at `services/res-server`. Extend auth-client to perform the BFF responsibilities; create no duplicate BFF, Resource Server, or protocol framework.
- Define the first mission as Authorization Code + PKCE S256 with OIDC, using a separate confidential Keycloak client configuration without mandatory PAR. Preserve the existing ePA client, required-PAR policy, header-based smoke-test operation, and PAR-based browser demonstration. A later comparison of standard and PAR variants is outside this integration.
- Specify browser navigation from the existing OAuth workspace to login, one-time callback correlation, validated server-side token exchange, cookie-based application session, safe return to Mission Control, session recovery, and local application logout. Tokens and protocol secrets remain in auth-client.
- Secure one synthetic FHIR resource in the existing HAPI server. Require independent access-token signature, issuer, audience, time, token-purpose, and permission validation, with direct Resource Server acceptance tests for success, invalid/missing credentials, insufficient permission, and denied operations.
- Define browser-owned, bounded run records and a versioned, typed safe event contract with operation-specific evidence, actual observer provenance, and front-channel/back-channel distinctions. Provider-internal checks remain Explained / Not observable. Resource response status alone does not establish which internal validation passed.
- Preserve the current Mission Catalog and Workspace design, artwork, panel hierarchy, selection behavior, keyboard access, diagram scrolling, German-default/English localization, fixture preview, and conceptual-only ePA mission. Introduce mission-owned execution behavior through existing capability boundaries.
- Identify and plan repairs for obsolete `services/epa-authorization` paths, Docker/Compose/tooling references, and duplicate HAPI Git entries. Keep `services/res-server` canonical; verify both worktrees and preserve local work before any future removal.
- Replace speculative creation tasks with small integration steps, each carrying its own verification and relevant documentation. Retain the five completed UI tasks as historical evidence; existing backend source alone does not complete future integration acceptance.

## Capabilities

### New Capabilities

- `authorization-flow`: Correlated browser login, isolated standard/ePA client behavior, application sessions and logout, and independently authorized synthetic resource access.
- `mission-experience`: Existing fixture behavior plus real mission navigation, safe run/event access, truthful evidence presentation, recovery, and preserved Mission Control interaction and localization.

### Modified Capabilities

None. The project's main-spec inventory is currently empty; both capability files already exist as deltas in this change.

## Impact

Future implementation affects the existing SPA, auth-client, Keycloak client configuration, HAPI submodule and its parent Git pointer, repository tooling, local Compose wiring, and current architecture/UX documentation. It adds no standalone service, broker, database, dynamic plugin system, or UI redesign.

## Review and Scope Boundaries

The owner accepted the reconciled design, scenarios, route/session/event contracts, Resource Server policy and ADR-0001/ADR-0002 on 2026-11-11. The change is APPROVED for local/private tasks 2–9; authorization does not constitute implementation or runtime verification. Preserve Accepted ADR-0003 and ADR-0004. Public OAuth/backend deployment requires separate authorization; the existing static UI hosting authorization does not cover it.

Real ePA/TI integration, SMART on FHIR, patient data, certification claims, provider-wide SSO logout, refresh-token workflows, durable run storage, distributed sessions, and a standard-versus-PAR comparison UI remain outside this first integration.

## Task 9.4 security remediation

**Proposed:** 2026-11-13. **Owner decision:** Approved on 2026-11-13 by the project owner
through explicit consolidated approval and `$openspec-apply-change 001-oidc-pkce`.
This approval is recorded before dependency implementation; it is not verification evidence.

The [integrated acceptance record](integrated-acceptance-verification.md#security-dependency-result-and-acceptance-blocker)
records the completed Zod patch and three additional transitive production dependency
findings blocking task 9.4. The owner authorizes resolving only these production dependencies:

| Dependency    | Baseline installed version | Required patched floor | Advisory                                                                 |
| ------------- | -------------------------- | ---------------------- | ------------------------------------------------------------------------ |
| `body-parser` | 2.3.0                      | `>=2.4.0`              | [GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828) |
| `multer`      | 2.4.0                      | `>=2.5.0`              | [GHSA-q7qp-rjg7-q26m](https://github.com/advisories/GHSA-q7qp-rjg7-q26m) |
| `qs`          | 6.16.0                     | `>=6.16.1`             | [GHSA-6pq8-jhm2-2vcw](https://github.com/advisories/GHSA-6pq8-jhm2-2vcw) |

The extension covers the smallest compatible patched resolutions, necessary package-manager
constraints and lockfile changes, and regression verification under the existing task 9.4.
Prefer the current package major versions and preserve NestJS and unrelated dependency pins.
A NestJS or other parent/dependency change is permitted only if a compatible patched
resolution of these three targets demonstrably requires it; document the exact minimal
change and why the existing parents or a targeted compatible resolution cannot suffice.
An incompatible framework migration or broader dependency refresh is outside this extension
and must be reported as a blocker.

Follow the [dependency resolution plan](design.md#task-94-dependency-remediation-plan).
Verify the actual nested production graph and frozen installation, rerun the original
quality/security/regression checks, and record versions, commands, results and remaining
findings without audit suppression or security exceptions. Other development-tool findings
and the HAPI remote-checkout limitation remain recorded independently; this extension
neither fixes nor waives them.

All existing task IDs, acceptance criteria, completed checkboxes and verification history
remain intact. Approval was recorded at **48/50**, with task 9.4 unchecked pending its full
existing acceptance. The [dated remediation evidence](dependency-remediation-verification.md)
now records its completion and **49/50** progress. Task 9.5, availability promotion, public routing/deployment, changes to
Keycloak/HAPI security policies, and changes to existing containers/volumes are excluded.
The public Playground remains fixture-only.

The consolidated owner decision covers this proposal, its design plan and the task 9.4
scope note together. It authorizes updating the three vulnerable transitive dependencies,
minimal technically required and documented supporting changes, and the specified security
and regression checks while preserving existing application behavior. The accompanying
apply request authorizes implementation after this approval record. Task 9.5 and changes
to public deployment or routing remain excluded; completion still requires actual evidence.
