# Change 001 — Readiness Review and Consolidated Approval Summary

**Change status:** APPROVED — LOCAL/PRIVATE IMPLEMENTATION AUTHORIZED

**Review date:** 2026-11-11

**Reviewer:** Codex, repository and documentation review

**Owner acceptance:** APPROVED by the project owner on 2026-11-11; see the consolidated decision below

## Review scope and decision

This review covers tasks 1.1–1.3 only. It checks planning consistency, compatibility with the inspected repository, UX/security boundaries, and whether the acceptance scenarios have observable assertions. It does not execute runtime acceptance, accept ADRs on the owner's behalf, or authorize implementation or deployment.

Task 1.1 review decision: the proposal, design and both capability specs are consistent with the existing visual contract and the separate standard/ePA boundary. No further product or architecture choice is needed to perform the documented local integration. The owner's subsequent explicit acceptance is recorded under task 1.4 below.

Tasks 1.1–1.3 are complete as documentation/advisory review. The actual architecture and both UX documents are reconciled; ADR/security review is recorded below. The owner's subsequent consolidated approval completes task 1.4 and marks the change APPROVED for local/private implementation. This step records that decision without starting tasks 2–9.

## Owner-directed planning decisions

The owner directed these choices in the planning requests and approved the corresponding artifact edits. These are recorded planning decisions, not formal acceptance of the complete change or its ADRs:

- Reuse `apps/playground`, `services/auth-client`, `infrastructure/keycloak`, and canonical HAPI submodule `services/res-server`. Add no duplicate BFF, Resource Server, realm, broker, or plugin framework.
- Demonstrate standard Authorization Code + PKCE S256 without a PAR dependency or call, using a separate confidential Keycloak client. Preserve the existing ePA required-PAR policy, stateless header operation and browser demonstration. A comparison UI is later work.
- Keep tokens in auth-client; use the proposed `/api/oauth` namespace and a fixed clean return to `/missions/oauth-oidc/workspace`.
- Protect only the synthetic `Basic/playground-demo` read through independent HAPI bearer and permission checks. No real patient data or TI/certification claims.
- Cancel context-bound pending/in-flight login attempts on local logout; check original-context/attempt eligibility after asynchronous exchange/validation and immediately before session commit.
- Complete authentication cleanup regardless of event capacity or recording failure. Retain only bounded, non-sensitive, browser-owned history under its original lifetime.
- Preserve Mission Control's current layout, artwork, fixtures, accessibility behavior, German-default/English localization and capability boundaries.
- Limit any later implementation approval to local/private integration. The existing public deployment stays fixture-only.

## Task 1.1 — UX and planning review

Reviewed [proposal](proposal.md), [design](design.md), [authorization-flow specification](specs/authorization-flow/spec.md), [mission-experience specification](specs/mission-experience/spec.md), the two [Catalog](../../../docs/design/mission-catalog.md)/[Workspace](../../../docs/design/mission-workspace.md) documents, and [visual references](../../../docs/design/visual-references.md), including both reference PNGs. The current fixture contracts and the existing browser-login/header controllers were inspected to distinguish implemented behavior from planned behavior.

| Concern                        | Review result and required observable outcome                                                                                                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Catalog availability           | Current two-card fixture/concept catalog remains usable. Real execution requires a separately enabled, verified runtime binding; absent binding is unavailable. The public static build remains fixture-only.                                    |
| Visual contract                | Retain dark navy/cyan hierarchy, approved JPEG artwork, left mission panel, central swimlanes, Inspector and timeline. No new dashboard, cards, fake debugger, or raw-data view. The PNGs remain illustrative where protocol behavior conflicts. |
| Start and provider navigation  | Mission-owned action uses normal browser navigation to the BFF, then Keycloak. Password entry occurs only at Keycloak. Provider internals cannot be paused or treated as observed steps.                                                         |
| Callback, return and refresh   | A correlated callback returns by clean 303 to the fixed OAuth Workspace. Session and owned-run reads restore state without replaying code exchange or resource calls. Unknown/expired/restarted context offers a fresh login.                    |
| Pending, denial and recovery   | Disable conflicting execution during restoration. Distinguish authentication success from resource 401/403 or unavailable upstream. Provider cancellation/failure has a safe retry using a fresh transaction.                                    |
| Local sign-out and race        | Signed-out state follows authoritative session state, even when an earlier callback finishes later. No stale authenticated cookie or overwriting of the replacement viewing context. Other browsers and ePA remain unaffected.                   |
| Event capacity/failure         | Ordinary execution can be refused before external work. Logout, cancellation and credential cleanup remain available; a missing logout observation is unavailable, never invented or presented as a complete trace.                              |
| Command effects                | Replay explanation and Reset view affect presentation only. Retry starts a fresh attempt. Local Sign out ends application authentication, not Keycloak SSO or previously issued bearer-token validity.                                           |
| ePA boundary                   | Workspace ePA remains conceptual with no operational events. Existing backend ePA/PAR behavior is preserved independently; backend availability does not make the ePA mission runnable.                                                          |
| Roles, channels and provenance | BFF is the confidential OAuth client; SPA is the UI/user agent. Keycloak AS/IdP are logical roles in one deployment. Separate browser redirects, back-channel calls and actor-local observations; do not infer provider checks.                  |
| Interaction and localization   | Preserve checkpoint/actor/event selection, keyboard/focus, reduced motion, structured text alternative, readable Fit/scrolling, and locale-independent state. Both languages and actual 100%/200% browser zoom remain required runtime checks.   |

The existing visual/UX verification history is retained as historical evidence, not reclassified as verification of the proposed runtime.

## Acceptance review method

Both revised specs were reviewed: **32 requirements and 74 Given/When/Then scenarios** (authorization-flow: 15/36; mission-experience: 17/38). Their assertions can be tested without exposing credentials in teaching evidence. This is a review of testability, not a claim that these runtime tests exist or pass.

The existing auth-client Jest/HTTP tests and Keycloak integration harness provide starting points. The existing Playground browser, architecture and localization suites provide fixture/layout checks. HAPI's Gradle project is the location for independent inbound security tests. Implementation tasks must add the missing assertions with their behavior; a mocked BFF-only success cannot establish Keycloak or HAPI acceptance.

### Focused cancellation and event-failure cases

| Existing scenario                                                           | Controlled setup and action                                                                                                                                                                                                      | Required assertions                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authorization-flow: Rejecting a pending transaction cancelled by logout     | Create an active standard session and a second pending login bound to its context. Perform valid Origin/CSRF logout, then deliver that callback.                                                                                 | Old session invalid; pending attempt cancelled; no token-endpoint request for the known cancelled attempt; no authenticated cookie/session; ePA and another browser unchanged.                                                                                                  |
| Authorization-flow: Logout during an in-flight callback                     | Hold the exchange response after one-time consumption; log out; release otherwise-valid tokens. Repeat with asynchronous ID Token validation held instead of exchange. Use deterministic deferred completion, not timing sleeps. | Final post-async eligibility check refuses commit; returned credentials discarded; no authenticated Set-Cookie; replacement unauthenticated viewing context preserved; session read stays signed out until a fresh login succeeds.                                              |
| Authorization-flow: Exhausted event storage during logout                   | Fill a run to 100 events with an active session and pending login. Exercise append rejection and a recorder exception during valid logout; also exercise collection bounds.                                                      | Logout completes; session/old cookie invalid, credentials removed and attempts cancelled; stale callback cannot authenticate; protected BFF request is 401 with no authenticated HAPI call; history bounds/original expiry preserved. No event exception can roll back cleanup. |
| Mission-experience: Reflecting logout when its observation cannot be stored | Return authoritative unauthenticated session state with eligible history and an unavailable logout observation.                                                                                                                  | Workspace shows signed out and no resource capability; owned safe history remains within original bounds/expiry; no invented event, timestamp or sequence and no complete-trace claim.                                                                                          |

## Task 1.2 — Architecture and UX alignment

Review decision: the actual document updates satisfy the design's system-context alignment checklist. This is document reconciliation, not runtime integration or owner acceptance.

| Checklist item           | Reconciled result                                                                                                                                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Four existing components | System context names the React SPA, existing NestJS auth-client/BFF, one Keycloak AS/IdP deployment and canonical HAPI submodule. HAPI security is explicitly missing implementation/verification.                                                                                    |
| Exact routes and return  | System context and Workspace describe all six proposed `/api/oauth` routes, fixed clean 303 return and `GET /fhir/Basic/playground-demo`. Obsolete `/auth/login`, `/auth/callback`, `/api/demo-resource` and generic upstream `/resource` are removed from the architecture baseline. |
| Profile separation       | Direct standard PKCE uses a separate confidential client without PAR; the stateless ePA header operation, browser `/login`/`/callback`/`/session`, cookies and required-PAR policy remain distinct. ePA Workspace stays conceptual.                                                   |
| Session and cancellation | Documents carry browser/profile correlation, minimal session DTO, isolated cookies, Origin/CSRF logout, pending/in-flight cancellation, final post-async eligibility check and unconditional cleanup.                                                                                 |
| Resource boundary        | Existing HAPI independently validates token and permission; only synthetic Basic read is allowed, other data operations denied. BFF is a fixed upstream adapter, not an arbitrary proxy.                                                                                              |
| Event provenance         | Versioned allowlisted evidence distinguishes BFF observer/time, explicit HAPI-reported decision and unobservable Keycloak internals. Missing observations remain unavailable.                                                                                                         |
| UX and hosting           | Catalog availability, Workspace restore/recovery/logout, owned bounded history, localization and visual contract match the specs. Existing public deployment stays fixture-only; local/private API integration remains proposed.                                                      |
| Prior history            | Existing dated UX/artwork paragraphs and static-hosting authorization text are preserved. Prior UI verification records are untouched and do not stand in for runtime acceptance.                                                                                                     |

Document checks confirmed all eight route/return/resource paths in both system context and Workspace, preservation of the historical paragraphs, and resolution of all 25 local links in the four reviewed documents at this stage.

## Task 1.3 — ADR and security review

**Reviewer:** Codex. **Date:** 2026-11-11. **Advisory decision:** no unresolved technical planning conflict; recommend the reconciled UX/security design and ADR-0001/ADR-0002 for owner acceptance. At the advisory-review stage, formal owner acceptance was pending; the subsequent explicit owner decision is recorded below.

| Decision document                                                                               | Review result                                                                                                                                                                                                                         | Acceptance state                                                                   |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [ADR-0001](../../../docs/architecture/decisions/ADR-0001-spa-bff-keycloak.md)                   | Reuses the actual SPA, NestJS confidential client, Keycloak and independent HAPI boundary. Exact routes, isolated standard/ePA profiles, server-held credentials, Origin/CSRF logout, cancellation and cleanup align with the design. | Accepted by the owner on 2026-11-11; approval checklist signed off for this design |
| [ADR-0002](../../../docs/architecture/decisions/ADR-0002-mission-boundaries.md)                 | Keeps static registration and mission-owned execution/projection. Clarifies the concrete typed event contract and fixture/runtime distinction without adding a plugin framework or layers.                                            | Accepted by the owner on 2026-11-11; approval checklist signed off for this design |
| [ADR-0003](../../../docs/architecture/decisions/ADR-0003-capability-first-code-organization.md) | Existing capability boundaries/public entries remain applicable. Current fixture event types are not falsely claimed to support runtime observations already.                                                                         | Accepted status and file contents unchanged                                        |
| [ADR-0004](../../../docs/architecture/decisions/ADR-0004-localization-and-i18n.md)              | German default/English, neutral contracts and presentation-only translation remain applicable. Locale change must not change execution state or literal evidence.                                                                     | Accepted status and file contents unchanged                                        |

### Security policy assessment

| Boundary                       | Reviewed policy and negative assertion                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profile/callback trust         | Server-selected profile binds issuer, client, callback and run. Browser correlation, one-time consumption and post-async eligibility prevent substitution/replay/stale session commit. Missing/foreign/expired/restarted contexts and concurrent callbacks cannot establish a session.                                                                                           |
| Token validation               | Existing maintained cryptographic/JWT validation is reused and made profile-aware. PKCE/code failure and independent issuer/audience/nonce/signature/algorithm/lifetime/authorized-party/token-hash failures cannot create standard authentication. No browser token processing is introduced.                                                                                   |
| Cookie/session/CSRF            | Distinct standard/ePA cookies; standard HttpOnly, Lax, API-scoped, Secure under HTTPS; callback-scoped short-lived binding; context rotation invalidates old identifiers. Exact Origin plus context-bound anti-CSRF header is required for logout; missing/foreign values or GET leave authentication unchanged. The anti-CSRF value is not trace evidence.                      |
| Lifecycle and capacity         | Cancel pending and already-consumed in-flight attempts; final original-context/attempt check and commit are synchronous. Trace rejection/exception cannot interrupt invalidation, cancellation or credential removal. Old cookies cannot regain access; retained viewing ownership has no resource authority and no renewed expiry.                                              |
| Independent resource policy    | HAPI checks signature/algorithm/key, issuer, resource audience, exp/nbf, purpose and permission independently. Test direct HAPI 200/401/403, ID Token/unsuitable-ePA-token rejection, missing permission, undeclared methods/resources/alternate data paths and data-free health. BFF permits only the configured synthetic read and rejects unauthenticated access before HAPI. |
| Trace ownership and provenance | Cookie ownership, not run ID, authorizes viewing. Enforce original 15-minute viewing lifetime, 1000-entry collection bounds and 100 events/run. BFF observer/time and explicit bounded HAPI report are distinct; missing reports/provider internals cannot be inferred. Unknown/unsafe data has no raw fallback.                                                                 |
| Disclosure and hosting         | Inspect session/run/resource projections, browser persistence and routine application/proxy/HAPI logs for secrets, raw callbacks/claims and full bodies. Future proxy logs omit callback queries. Same-origin local/private wiring does not authorize a public API or provider deployment; current public UI stays fixture-only.                                                 |
| ePA preservation               | Existing header smoke operation remains stateless; existing browser binding/callback/session contract and cookies are retained. Standard discovery does not depend on PAR; the existing ePA PAR policy still rejects bypass. No ePA runtime UI or compliance claim is introduced.                                                                                                |

These policies align with the [OAuth Security BCP](https://www.rfc-editor.org/rfc/rfc9700), [OWASP session invalidation guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#logout-button), and Spring's [independent JWT resource-server validation model](https://docs.spring.io/spring-security/reference/6.5/servlet/oauth2/resource-server/jwt.html). These references support the boundary review; they do not prove this repository already implements it. Dependency coordinates and actual HAPI/Spring wiring still require the implementation checks already planned in group 6.

### Requirement-by-requirement testability

The assertion summaries below group the existing scenarios under every requirement. All test approaches are **planned verification**, not executed runtime results.

| Authorization-flow requirement                               | Observable assertion / verification approach                                                                                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Start a correlated real authorization request                | HTTP/integration harness verifies fresh state/nonce/S256 binding and direct standard redirect; no PAR call; standard discovery works without PAR metadata.               |
| Preserve the existing ePA and PAR behavior                   | Keep current stateless header HTTP and browser-login regressions; real Keycloak rejects ePA PAR bypass while standard client succeeds without PAR.                       |
| Bind callbacks to the originating browser and client profile | Cookie/profile/host/instance/restart/expiry negative cases never exchange or authenticate from an ineligible transaction.                                                |
| Consume a valid transaction once                             | Concurrent/replayed callback harness counts at most one exchange; failure after consumption cannot reuse the attempt.                                                    |
| Complete only after valid callback and OIDC validation       | Real signed-token fixtures independently vary each validation input; malformed/provider-denied/PKCE/code failures create no session and expose no provider body.         |
| Return to the fixed Mission Control route                    | Assert 303 fixed Location without callback parameters; caller-selected destination/client/issuer/callback rejected; foreign context gets no run access.                  |
| Expose a minimal cookie-based application session            | Inspect DTO and Set-Cookie; verify isolated cookies, rotation and expiry capped by token lifetime; no token/claim dump.                                                  |
| Protected API uses Access Token authorization                | Spy on the one configured upstream call and bearer type; unauthenticated BFF request is 401 without HAPI access; arbitrary proxy targets rejected.                       |
| Resource Server independently validates bearer credentials   | Direct HAPI HTTP tests exercise valid Access Token and each invalid/missing credential, including wrong issuer/audience, lifetime and token purpose.                     |
| Resource Server authorizes only the declared exercise        | Direct HAPI tests show permitted Basic read, 403 for missing permission/undeclared operations, no alternate data bypass and data-free health.                            |
| Application sign-out prevents subsequent access              | Valid logout invalidates old cookie/token references; BFF resource is 401 without authenticated upstream call; new login may use independent Keycloak SSO.               |
| Prevent stale callbacks after logout                         | Deterministic pre-exchange and deferred exchange/validation tests assert cancellation, no stale commit/cookie and unchanged replacement viewer; see focused cases above. |
| Authentication cleanup is independent of event persistence   | Capacity/append-rejection/throw fault injection proves cleanup and expiry cleanup remain effective; no credential retention, bound extension or fabricated event.        |
| Protect local logout against cross-site requests             | Parameterized Origin/header/context/method negatives leave authentication unchanged; valid same-origin request ends it.                                                  |
| Protocol traces contain no secrets                           | Inspect all projected DTOs, rendered evidence, browser storage and captured routine logs across success/negative cases; assert no secret/raw-body fallback.              |

| Mission-experience requirement                                | Observable assertion / verification approach                                                                                                                            |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fixture catalog and routing                                   | Browser checks retain two previews, truthful badges/routes, conceptual ePA and fixture-only public build.                                                               |
| Independent learning and fixture selection                    | Checkpoint/actor selection does not execute or load samples; explicit sample loading preserves separate learning/inspection identity.                                   |
| Honest samples and safe inspection                            | Fixture evidence has no invented observer/time/auth result; fixture and real-run documents do not mix.                                                                  |
| Preserve the Mission Control visual contract                  | Compare existing hierarchy/artwork/panels and runtime-state rendering against reference/fixture baseline; no redesign or raw-data panel.                                |
| Responsive accessible interaction                             | Browser keyboard/focus/reduced-motion/text-alternative checks in both languages, narrow widths and actual 100%/200% zoom; readable Fit and map-local scrolling.         |
| A visitor can select a real available mission                 | Only enabled/verified binding offers real execution; absent/unavailable binding shows truthful recovery with no fabricated request.                                     |
| The workspace is not OAuth-specific                           | Existing architecture/import checks plus both mission families demonstrate generic shell without mission-ID/protocol branches.                                          |
| Browser redirects do not fake a stepped debugger              | Browser trace observes top-level navigation; BFF only records its own front-channel observations, not provider login/PKCE internals.                                    |
| Restore the current run after callback navigation             | Session/owned-event reads recover the same run; refresh adds no authorization/exchange/resource request; missing/expired/restarted context recovers safely.             |
| Serve only browser-owned run evidence                         | Two browser contexts and run-ID-only requests prove access denial; rotated logout viewer retains only its eligible history.                                             |
| Bound run retention and event collections                     | Controlled clock/capacity tests prove 15-minute original expiry, 1000-entry/100-event limits, no false complete trace and logout independent of append success.         |
| Use a versioned typed safe event contract                     | Contract/projection checks reject bad versions/kinds/fields/actor/channel/evidence; repeat reads/locale/replay preserve IDs, sequence and observer time.                |
| Evidence is not confused with explanation                     | Inspector tests distinguish actual BFF observation, explicit HAPI report, unavailable reason, fixture and provider explanation; BFF denial fabricates no HAPI exchange. |
| States have useful recovery                                   | Browser checks pending/failure/cancellation/authenticated/resource-denied states and fresh retry; successful login does not imply permitted resource access.            |
| Recovery and learning commands have distinct effects          | Count operations during Replay/Reset (none), Retry (fresh attempt) and Sign out (local invalidation, eligible history retained).                                        |
| Localize runtime presentation without changing protocol state | Matching German/English resources and browser locale switching preserve route, run/checkpoint/event identity, map scale and literal evidence.                           |
| Keep sensitive data out of the learning surface               | Browser/projection/log inspection covers runtime and fixtures; no credential, unsafe URL, claim dump, full body or unsafe JSON fallback.                                |

## Remaining conflicts and implementation work

No unresolved technical planning conflict remains within tasks 1.1–1.3. Readiness review and the owner's explicit task 1.4 approval are complete. Tasks 2–9 are authorized for local/private implementation; none was started in this approval-recording step.

The standard routes, profile configuration, HAPI enforcement, event contract, SPA adapter and runtime tests are planned work, not existing functionality verified by this review. Known obsolete paths/Compose/tooling references, duplicate HAPI gitlink, dependency/configuration checks and existing-realm migration also remain in groups 2–9. They must be handled with the baseline and verification steps already listed there; none was repaired or waived here.

Prior UX/browser verification remains historical fixture evidence. Runtime acceptance, visual/accessibility checks with the real binding, ePA regressions and four-component tests have not been run for this documentation-only task.

## Consolidated owner approval summary

**Owner decision: APPROVED for local/private implementation.**

**Decision date:** 2026-11-11

**Approver:** Project owner, by explicit instruction in this conversation

**Recorded by:** Codex, readiness task 1.4

The owner stated:

> I approve OpenSpec change `001-oidc-pkce` for local/private implementation.

Formal decisions:

- **ADR-0001 and ADR-0002:** Accepted.
- **Reconciled UX and visual design baseline:** Accepted.
- **Security architecture and revised specifications:** Accepted, including pending/in-flight logout cancellation, the final post-async session-commit check, and authentication cleanup independent of event storage.
- **Tasks 2–9:** Authorized for local/private implementation within the accepted plan. Task 1.4 is complete and the change is deliberately marked APPROVED.
- **Public boundary:** Do not deploy real authentication publicly. Keep the existing public Playground fixture-only.
- **This step:** Record the approval only. Do not start implementation.

The accepted scope preserves ePA/PAR, fixture mode, Mission Control visuals/localization and bounded safe evidence, and adds no duplicate architecture. Acceptance of the specifications is not a claim that runtime acceptance tests have passed. Existing deferred localization copy review and unrelated change statuses are unaffected.

The approval is the owner's explicit decision, rather than a planning-file confirmation, advisory recommendation or CLI `ready`/`isComplete` flag. Public authentication deployment requires separate authorization.

The next implementation task remains 2.1, under the dependencies already defined in the accepted plan. No task in groups 2–9 was started or marked complete by this step.

## Verification record — tasks 1.1–1.3 snapshot before owner approval

- `openspec.cmd validate 001-oidc-pkce --strict --json`: passed, zero issues. This checks OpenSpec structure, not runtime correctness or owner approval.
- Prettier check: passed for all eight changed Markdown documents.
- `git diff --check` and an all-eight-file trailing-whitespace check: passed, including the new review document.
- Local Markdown link check: 38 targets resolved; no missing local files.
- Consistency audit: all six standard API routes, fixed return and synthetic read are present in system context and Workspace; all 32 spec requirements have review entries and the scenario count is 74.
- Preservation audit: five completed UI history tasks, exact task 1.4 wording/unchecked state and groups 2–9 are unchanged. ADR-0001/ADR-0002 status/approval checklists are unchanged; SHA-256 comparison confirms ADR-0003/ADR-0004 files are unchanged. Existing UX history and static-hosting authorization text are preserved.
- OpenSpec apply progress: **8/50 complete**; tasks 1.1–1.3 completed, task 1.4 unchecked. The change remains DRAFT. Modified files are documentation/task tracking only.

No application, Keycloak, HAPI, infrastructure or browser acceptance tests were executed for this documentation-only task. Those results remain pending with implementation; no code, configuration, submodule pointer or public deployment was changed.

## Approval recording verification — task 1.4

- Owner approval is recorded above with date, approver, formal decisions, local/private scope and the explicit instruction not to start implementation in this step.
- Proposal, design, both capability specs and tasks are marked APPROVED for local/private implementation. ADR-0001/ADR-0002 are Accepted; repository authorization notices and UX/architecture acceptance records match the decision.
- OpenSpec apply progress is **9/50 complete**: readiness tasks 1.1–1.4 are complete. All 41 tasks in groups 2–9 retain their original unchecked state and wording; none was started.
- All 32 requirements and 74 scenarios are unchanged. Five completed UI history tasks, ADR-0003/ADR-0004 and the static-hosting contract are unchanged. Runtime Gate E remains unchecked; separate deferred localization copy review is unaffected.
- `openspec.cmd validate 001-oidc-pkce --strict --json`: passed, zero issues.
- Prettier check and `git diff --check`: passed. All 16 changed files are Markdown documentation/task records; 67 local link targets resolve and the whitespace check passes.
- No application/configuration/submodule/deployment change or runtime test execution occurred. The existing public Playground stays fixture-only; public real authentication remains unauthorized.
