# Change 001 — Integration Design

**Status:** APPROVED — LOCAL/PRIVATE IMPLEMENTATION AUTHORIZED

**Planning revision:** 2026-11-11

The project owner accepted this design, the reconciled UX/visual baseline and revised specifications on 2026-11-11, authorizing local/private implementation of tasks 2–9. See the [owner approval record](readiness-review.md#consolidated-owner-approval-summary) and [proposal.md](proposal.md) for scope. Recording this decision starts no implementation; public authentication deployment remains excluded.

## Context

| Component                 | Inspected state                                                                                                                                                                            | Integration responsibility                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `apps/playground`         | Implemented React Mission Catalog/Workspace; fixture and concept modes; no backend execution adapter or development proxy                                                                  | Keep existing presentation; add mission-owned execution coordination and safe event projection                         |
| `services/auth-client`    | NestJS client with discovery, PAR, S256 transaction generation, browser binding, callback processing, token exchange, ID Token checks, bounded process-local sessions, and `/session` JSON | Reuse as the BFF; add an isolated standard mission path, local logout, resource access, and run observations           |
| `infrastructure/keycloak` | Existing `epa-demo` realm and confidential client; S256 required; client-role-selected policy enforces PAR                                                                                 | Add a separate standard mission client and resource audience/permission configuration without weakening the ePA client |
| `services/res-server`     | HAPI FHIR submodule at `253e15666f4a8640b2b13934524fe27f518e9b56`; Java 21/Gradle; README says security is planned                                                                         | Implement and verify inbound Resource Server security in this existing component                                       |

The current auth-client browser demonstration always uses PAR and redirects successful callbacks to `/session`. Its configuration and token checks assume one client. Its discovery schema requires a PAR endpoint. It has no application logout, protected-resource adapter, run/event API, or Mission Control return path.

The HAPI fork has a resource-server dependency declaration and placeholder `security.oauth2` settings, including `enable: false` and a different local issuer. These do not establish working bearer validation or authorization. No application security filter chain, audience validator, or FHIR permission enforcement was found. Verify dependency coordinates against the pinned Spring Boot 3.5 line before relying on them.

Two parent gitlinks point to the same HAPI commit: `services/res-server` and `services/hapi-fhir-jpaserver-secured-starter`. Only the canonical path has a mapping in `.gitmodules`; a full `git submodule status` currently fails. Both worktrees must be checked before any future cleanup.

Existing reference defects include:

- `infrastructure/docker-compose.yml` builds the absent `services/epa-authorization/Dockerfile`.
- `services/auth-client/Dockerfile` still copies, builds, and runs `services/epa-authorization`.
- `pnpm-lock.yaml` retains the old importer path.
- Root lint tooling and `eslint.config.mjs` use the old source path.
- README, EPA guide, architecture/specification documents, and earlier planning text retain stale paths.
- The root Compose stack does not integrate HAPI; the submodule's standalone Compose publishes port 8080, conflicting with default Keycloak publication.

The existing package name `@epa-auth-lab/authorization`, Compose service labels, and conceptual actor ID `epa-authorization` are not automatically obsolete filesystem paths. Preserve stable identifiers unless an explicit repair requires a documented rename. Do not rewrite historical verification reports merely to replace an old path.

## Goals / Non-Goals

**Goals:** Integrate existing components, isolate the two OAuth request variants, define observable and testable browser/resource boundaries, and preserve the implemented Mission Control design and frontend architecture.

**Non-goals:** A new BFF or demo Resource Server, another Keycloak deployment or realm, runtime plugins, a protocol DSL, a message broker, durable/distributed sessions, SMART on FHIR, TI/ePA runtime, provider-wide logout, refresh-token workflows, a PAR comparison UI, or public authentication deployment.

## Decisions

### 1. Extend the existing OAuth client

Keep auth-client as the single confidential OAuth client process for this integration. Reuse existing transport, discovery, transaction generation, browser binding, token exchange, and ID Token verification. Make the existing behavior explicitly aware of a small, fixed server-selected client profile:

- `epa-par`: existing ePA configuration, required PAR, current header-based operation and browser demonstration.
- `playground-standard`: separate standard mission configuration, direct Authorization Code + PKCE authorization request, no PAR call.

Store the selected profile, issuer, client identity, redirect URI, and run association in the server-side pending transaction. Derive exchange credentials, ID Token audience/authorized-party checks, and return handling from that stored context. Never select the client secret, issuer, callback, or transport mode from untrusted callback/query input.

Discovery validates the endpoints needed by each profile. PAR metadata remains required for the ePA profile and is not a prerequisite for the standard path. Cache metadata and keys with the correct issuer/JWKS identity; apply client-dependent checks for every transaction.

Reuse established cryptographic/JWT libraries and preserve existing validation cases. This change does not require replacing the existing login implementation with a second OIDC stack.

**Alternative considered:** Another BFF or generic provider/plugin framework. Rejected because the needed client capabilities already exist.

### 2. Use a separate Keycloak client in the existing realm

Add a confidential client with proposed ID `playground-oidc` to the existing configured realm. Keep client credentials server-side. Enable only Authorization Code flow, require PKCE S256, register the exact mission callback URI, and disable implicit, password/direct-access, and service-account grants.

Do not attach the existing ePA `require-par` marker or alter its PAR policy. A normal standard authorization request succeeds without `request_uri`; the ePA client still rejects PAR bypass.

Configure a resource audience `playground-fhir` in standard Access Tokens and a narrowly scoped permission `demo.fhir.read`. Request `openid demo.fhir.read` for the standard mission. ID Tokens retain the OAuth client's audience and do not serve as Resource Server credentials. Test omitted permission using a narrower grant in the integration harness; do not add arbitrary scope/token controls to the learner UI.

Keep existing ePA environment variables and meanings. Add explicit standard mission client/secret/callback settings and configured application origin/resource endpoint. Share the existing issuer where appropriate. Values are validated at startup; no frontend client secret is introduced.

Update both the fresh-realm configuration and the documented migration for an existing realm. Preserve the existing Keycloak data volume and ePA client. A startup realm import must not be treated as proof that an existing realm received the new configuration.

**Alternative considered:** Disabling PAR on the existing ePA client or creating another realm. Rejected to preserve ePA behavior and reuse the existing provider.

### 3. Give the mission a same-origin browser API

The proposed browser-facing route namespace is `/api/oauth`, served by the existing auth-client. Keep the current ePA `/login`, `/callback`, `/session`, cookies, and `/epa/authz/v1/send_authorization_request_fdv` contract intact.

| Route                               | Behavior                                                                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/oauth/login`              | Browser navigation creates a fresh run and one-time transaction, sets browser binding, and redirects to Keycloak using the standard profile                         |
| `GET /api/oauth/callback`           | Validate callback, binding, stored profile, and tokens; consume once; establish session only on success; respond with a clean 303 back to the fixed OAuth Workspace |
| `GET /api/oauth/session`            | Return minimal authentication/expiry and current run/outcome state; never return tokens, raw claims, cookies, or transaction secrets                                |
| `POST /api/oauth/logout`            | Enforce same-origin and CSRF checks, remove local authentication/token references, rotate browser context, and return an unauthenticated result                     |
| `GET /api/oauth/resource`           | Require the standard application session, call the single configured synthetic FHIR read using the server-held Access Token, and return a bounded safe result       |
| `GET /api/oauth/runs/:runId/events` | Return allowlisted events only after checking browser viewing ownership and run lifetime                                                                            |

The return route is `/missions/oauth-oidc/workspace`. Do not accept arbitrary `returnTo` destinations or place codes, state, tokens, provider error text, or callback URLs in it. Correlated provider denial/exchange/validation failures are represented as safe server-side outcomes and return to the same Workspace. An uncorrelated callback gets no access to another browser's run; the Workspace offers generic recovery if its own context cannot be recovered.

Use normal top-level browser navigation, not an API-client-generated authorization link or a fetch of the provider login page. Login and callback must use the same application host and the same running auth-client instance. Reject malformed callback shapes, absent/mismatched state or browser binding, replay, and expired transactions; a backend restart loses in-memory context and requires a fresh login.

Add same-origin API proxying through the existing Vite configuration and, for private container testing, the existing Nginx server after implementation approval. The fixture-only build remains independently usable. The first integration is local/private; adding API routing to the publicly hosted site requires separate deployment authorization. No broad credentialed CORS policy or new gateway is needed.

Apply no-store and safe referrer handling. Configure any introduced proxy access logging to omit callback query strings, credentials, and HTTP bodies.

**Alternative considered:** Browser-held bearer tokens, arbitrary cross-origin APIs, or redirecting to the current JSON `/session` page. Rejected because the BFF retains credentials and the learner returns to Mission Control.

### 4. Separate authentication from safe run viewing

Reuse the bounded in-memory storage approach. Standard mission browser context associates an opaque, HttpOnly cookie with its current/owned runs and optional authenticated login. Use a distinct cookie name from the ePA demonstration, scoped to the mission API, with SameSite=Lax and Secure under HTTPS. The binding cookie is limited to the callback and the existing ten-minute login lifetime.

Rotate the standard browser context identifier on authentication and logout, invalidating the old identifier while retaining internal ownership of eligible safe run history. After a logout request passes the existing Origin/anti-CSRF checks, invalidate the active standard application session, remove its server-held token references, and cancel every pending login attempt bound to that context. Cancellation also applies to an attempt whose callback was already consumed and is awaiting token exchange or ID Token validation. The replacement context is unauthenticated and can only inspect its own eligible safe history. A run ID is an identifier, not authorization.

A callback for a cancelled transaction is rejected before exchange where cancellation is already known. Preserve one-time consumption before exchange. After all asynchronous token exchange/validation work, recheck that the original context and login attempt are still eligible, unexpired, and neither cancelled nor superseded, immediately before committing a new session. Do not rely only on the callback's earlier correlation check or the continued existence of an unauthenticated history-viewing context. The final validity check and session commit form one synchronous local state transition.

If logout or context invalidation happened while the callback was waiting, reject the stale completion, discard returned credential references, and issue no authenticated cookie. It must not recreate authentication, overwrite the replacement viewing context, or restore the old context. A later explicitly started login uses a fresh transaction. Apply this cancellation rule only to the standard context being logged out; preserve other browsers' contexts and all existing ePA/PAR contracts. These are lifecycle rules in the existing process-local records, not a new cancellation endpoint or service.

Use the existing fifteen-minute maximum for browser viewing context/run lifetime and cap authentication at the earlier token expiry. Keep collection capacity bounded to the existing order of 1000 entries and cap events per run at 100; reject new ordinary execution work safely at capacity. These guards must never reject or defer session invalidation, pending-login cancellation, or credential cleanup. Expiry prunes records and discards credentials. Do not silently truncate an event stream and claim it is complete.

Authentication cleanup and authorized logout do not depend on successful teaching-event persistence. Complete invalidation/cancellation and credential removal even if recording an event is rejected, fails, or throws; do not roll back authentication cleanup or rethrow a recording failure before completing it. An event limit is not a prerequisite for logout or expiry cleanup. Retain only existing bounded, non-sensitive history under its valid unauthenticated viewing ownership and original lifetime; do not expand the quota, extend retention, or retain credentials to preserve evidence. If the logout observation cannot be recorded, show the authoritative signed-out session state and mark that observation/trace completeness unavailable rather than fabricate an event or report the trace as complete.

Keep all login/session/run credentials out of localStorage, sessionStorage, URLs, teaching events, and routine logs. The only existing persistent frontend preference remains the explicitly chosen locale.

POST logout uses an exact configured Origin check and an anti-CSRF token bound to the browser context, obtained through the same-origin session response and supplied in a request header. It is never a teaching-event field. The authenticated cookie alone is not sufficient for a cross-site state-changing request. GET endpoints do not log out or mutate protected resources.

Local logout does not assert provider SSO logout or immediate revocation of a previously issued bearer token. The BFF denies access through the invalidated application session.

**Alternative considered:** Keeping the authenticated session alive to retain traces, or exposing a bearer-like run link. Rejected; safe viewing ownership and resource access are separate permissions.

### 5. Protect a narrow synthetic resource in HAPI

Use one synthetic R4 `Basic` resource, proposed logical ID `playground-demo`, with a clearly fictional demo code and no patient/clinical content. The learner's protected operation is `GET /fhir/Basic/playground-demo`. Seed it through local integration/test setup, without an exposed anonymous write endpoint.

Implement security in `services/res-server` using Spring Resource Server support and the existing HAPI integration points. Verify/correct the dependency declaration and Spring property binding against the pinned versions. Build no duplicate resource service or reusable security framework.

The inbound bearer boundary independently validates trusted signature/algorithm/key, issuer, resource audience, exp/nbf, token purpose, and the required permission. It does not trust SPA/BFF login claims or treat a forwarded ID Token as an Access Token. No session cookie authenticates directly to HAPI.

Apply `demo.fhir.read` to the exact synthetic read. Default-deny other FHIR reads/writes/search/history/batch/transaction operations and data-bearing alternate endpoints, including MCP/CDS hooks, outside the approved exercise. Keep only explicitly reviewed data-free health/readiness routes unauthenticated. Use minimal HAPI authorization rules where needed to enforce the resource boundary; prove there is no alternate data-access route around it.

Return 401 for missing/invalid bearer credentials and 403 for valid credentials without permission or for undeclared operations; return no protected data on denial. Verify both direct HAPI requests and the BFF path. Exercise valid token, wrong issuer/audience/signature, expired/not-yet-valid token, ID Token substitution, missing permission, forbidden method/resource, and post-logout BFF access.

For the first mission, the BFF calls only the configured read endpoint, forwards only its server-held Access Token, applies time/response-size limits, and returns a small synthetic resource view or stable safe failure code. It never acts as an arbitrary URL proxy.

**Alternative considered:** BFF-only access checks or permitting all FHIR operations for any valid JWT. Rejected because the Resource Server is an independent authorization boundary.

### 6. Define a versioned safe observation contract

Use a finite discriminated event contract, not a universal protocol DSL. Its common fields are:

| Field                                         | Meaning                                                          |
| --------------------------------------------- | ---------------------------------------------------------------- |
| `schemaVersion`                               | Initial version 1                                                |
| `eventId`, `runId`                            | Opaque non-credential identifiers                                |
| `sequence`                                    | Monotonic order within the BFF's run record                      |
| `observedAt`                                  | Actual observer timestamp; never a fabricated provider timestamp |
| `observedBy`                                  | Component that recorded the observation                          |
| `kind`                                        | Closed operation/event classification                            |
| `sourceActorId`, `targetActorId` or `actorId` | References to existing neutral actor identities                  |
| `channel`                                     | Front-channel, back-channel, or actor-local observation          |
| `outcome`                                     | Closed success/failure/denial classification                     |
| `evidence`                                    | Operation-specific allowlisted fields, selected by event kind    |

Initial event kinds cover authorization start/redirect, callback acceptance/rejection, token exchange outcome, session establishment/end, and resource request/response. A resource-response event can include an explicitly reported Resource Server decision. Per-kind evidence contains only relevant literal classifications: response type `code`, PKCE method `S256`, operation alias, HTTP status, and stable safe reason codes. Unknown fields/kinds are rejected at the projection boundary; there is no free-form metadata object or provider body fallback.

The BFF observes its own validation and exchange outcomes and the response it receives from HAPI. A 200 response alone is not an observed list of HAPI signature/audience/permission checks. For the decision explanation, HAPI emits a small explicit report using fixed response headers: X-Playground-Decision (allowed or denied) and X-Playground-Reason (demo-read-allowed, missing-token, invalid-token, insufficient-permission, or operation-not-allowed). The BFF accepts only these bounded enum values from the configured upstream and projects them as a Resource Server-reported decision inside its resource-response evidence. That event is observedBy auth-client with the BFF's response timestamp, while the nested report is reportedBy res-server; it does not fabricate a Resource Server timestamp or a list of internal checks. Without a valid report, expose only the BFF-observed HTTP result and state that the decision reason is unavailable.

Do not claim to observe Keycloak password validation, internal PKCE comparison, or provider token creation. Those remain separate explanations or Not observable annotations, not observed timeline events. A token exchange result is evidence of the BFF's result.

Exclude passwords, codes, verifiers, state/nonce, tokens, client secrets, cookies, raw user claims/identifiers, raw callback URLs, arbitrary headers, and entire HTTP bodies. Observations from rejected or unowned callbacks cannot reveal or modify another browser's run.

Serve the bounded run/event document on return, refresh, and after relevant mission actions. No event bus, polling scheduler, WebSocket, log scraping, database, or cross-service event collector is needed.

**Alternative considered:** Serializing arbitrary request/response objects or relabeling fixture events as observed. Rejected for confidentiality and evidence integrity.

### 7. Preserve the frontend capability and visual contracts

Keep the current header, mission cards, artwork, left objective/checkpoint panel, central swimlanes, Inspector, and timeline. Reuse button/badge treatments, actor IDs, scrolling, text alternative, keyboard focus, and readable map Fit. New runtime status and actions use the existing layout.

Mission owns its execution binding, run coordination, API adaptation, and safe-event-to-neutral-presentation projection. Protocol-flow owns neutral actor/event contracts and selection/rendering; it must not import OAuth, Keycloak, HAPI, or mission implementations. Extend its fixture-only event shape with a deliberate observed variant, preserving truthful fixture/internal annotations. Application/domain/data do not import localization runtimes or dictionaries. Do not create a model layer, plugin registry, duplicate selection store, or speculative repository/service framework.

The static fixture build keeps the existing OAuth fixture and conceptual ePA behavior, including no backend execution. A separately enabled, verified integration binding makes the standard mission executable. Fixture samples and real observations are distinguishable and are never merged into a fabricated run.

After callback navigation, the fixed Workspace route rehydrates the current browser-owned run and minimal session state. A failed session/run fetch is shown as a safe recovery state. Learning checkpoint/inspection selection remains distinct from protocol execution and must not advance merely because an event arrives. Changing language does not reset mission/run/selection/map state.

Add matching German and English semantic resources for runtime actions, outcomes, reasons, and accessibility text. Technical evidence values/IDs stay literal. The catalog claims Available only when the configured runtime has end-to-end verification; existing public fixture deployment keeps honest preview availability.

**Alternative considered:** Rebuilding Mission Control, embedding OAuth branches in its renderer, or preserving credentials in browser storage. Rejected by the existing design and ADR-0003/ADR-0004.

## Required architecture-document alignment (readiness 1.2)

This change's existing component/endpoint decisions are the owner-approved local/private integration baseline. The earlier artifact-only follow-up recorded the following required edits. On 2026-11-11, the scoped readiness application reconciled `docs/architecture/system-context.md` and both UX documents against this checklist; task 1.2 evidence is recorded in [readiness-review.md](readiness-review.md). Document alignment alone did not imply owner acceptance; the later explicit owner decision is recorded separately below.

| Current documentation                                             | Required alignment                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generic SPA, NestJS BFF, and demo API labels                      | Identify `apps/playground` as the SPA/browser UI, `services/auth-client` as the existing confidential client/BFF, `infrastructure/keycloak` as one AS/IdP deployment, and canonical HAPI submodule `services/res-server` as the independent Resource Server |
| `GET /auth/login`, `GET /auth/callback`                           | Use standard mission `GET /api/oauth/login` and `GET /api/oauth/callback`; show the exact clean 303 return to `/missions/oauth-oidc/workspace`                                                                                                              |
| `GET /api/demo-resource` and BFF-to-API `GET /resource`           | Use `GET /api/oauth/resource` and the server-held Access Token call to `GET /fhir/Basic/playground-demo`; HAPI independently enforces token validity and `demo.fhir.read`                                                                                   |
| Missing session/logout/run retrieval contracts                    | Add `GET /api/oauth/session`, `POST /api/oauth/logout`, and `GET /api/oauth/runs/:runId/events` with their existing minimal DTO, Origin/CSRF, and independent viewing-ownership boundaries                                                                  |
| Incomplete logout lifecycle                                       | State context-bound pending/in-flight login cancellation, the final post-async eligibility check, rejection of stale session commits, and cleanup that never depends on event persistence or trace capacity                                                 |
| Unresolved standalone repository or new Resource Server placement | Replace those obsolete alternatives with reuse of this repository and existing HAPI submodule; record ADR acceptance and the explicit local/private implementation authorization                                                                            |
| Blanket “PAR for later change” framing                            | Distinguish the new direct standard PKCE client from the preserved required-PAR ePA client, header smoke endpoint, and legacy `/login`, `/callback`, `/session` demonstration; defer only the comparison UI                                                 |
| Generic trace claims and hosting description                      | Carry over BFF-observed versus explicitly HAPI-reported evidence, unobservable Keycloak internals, local/private integration, and unchanged static-only public hosting authorization                                                                        |

Keep the AS/IdP conceptual sequence and actual browser/back-channel traffic distinct. Preserve the current Mission Control design and generic renderer boundaries. Do not mark HAPI security as already implemented. ADR-0001/ADR-0002 acceptance and local/private implementation authorization come from the explicit owner decision, not document alignment alone. Public authentication remains unauthorized.

Readiness review checks the cancelled-before-exchange, logout-during-in-flight-callback, and event-storage-exhaustion scenarios in the capability deltas against this lifecycle. The consolidated record distinguishes completed document/advisory review, the owner's explicit acceptance of UX/ADRs and local/private implementation authorization under task 1.4, and still-pending runtime verification.

## Risks / Trade-offs

- **Process restart and single-instance memory:** Transactions, authentication, and run history are lost on restart. Show safe recovery and require a fresh run; persistence/multi-instance operation are later work.
- **Profile leakage:** Bind every transaction and token check to its server-selected profile; keep separate cookies/routes and exercise cross-profile rejection plus ePA regressions.
- **Unsecured HAPI or alternate endpoint:** Fail closed, default-deny undeclared data routes, and run direct Resource Server tests before claiming protected access.
- **Existing realm state:** Apply an explicit non-destructive client/configuration migration and verify it; do not reset the Keycloak volume.
- **Broken paths and duplicate worktrees:** Check both nested repositories for local work and ownership before canonicalizing the parent gitlink; preserve the pinned commit/history.
- **Proxy/issuer mismatch:** Use one canonical application host and a browser/backend-reachable issuer; test real redirects through the configured local proxy.
- **Overstated telemetry:** Preserve observer/reporter provenance and keep provider internals separate from observations.

## Migration Plan

1. Readiness review and owner approval are recorded: architecture/UX documents are reconciled, both capability specifications and ADR-0001/ADR-0002 are accepted, and local/private implementation is authorized. Retain accepted ADR-0003/ADR-0004. This approval-recording step starts no task in groups 2–9.
2. After approval, repair source/build/lockfile/Compose references and canonicalize the duplicate HAPI gitlink after checking both worktrees. Keep the existing package/service/protocol identifiers unless a verified repair needs a rename. Land focused checks and documentation with each repair.
3. Add the separate Keycloak client/audience/permission configuration and migrate an existing local realm without deleting its volume. Verify existing ePA PAR tests before and after.
4. Extend auth-client incrementally: profile-aware authorization and validation; standard browser routes/session/logout; resource access; bounded safe runs/events. Attach relevant verification at each step.
5. Implement and test the HAPI resource boundary in the canonical submodule. Review the nested-repository diff and, once committed through the normal workflow, update the parent gitlink to that reviewed commit. Do not edit the duplicate worktree.
6. Connect the mission-owned SPA adapter and execution binding. Preserve fixture mode, styling/assets, localization, architecture boundaries, keyboard behavior, and layout.
7. Run the complete local browser journey, direct Resource Server negative cases, ePA regressions, and secret-leak checks. Record actual evidence before enabling runnable availability.

Rollback disables the runtime binding and restores fixture-only operation; reverses only the integration's route/configuration changes and parent gitlink as reviewed; preserves the ePA client, PAR policy, realm data, and unrelated submodule work. Never use a volume reset as rollback.

## Open Questions

**Open Decision — later public hosting:** Public OAuth/backend ingress, TLS/cookie/proxy settings, and operational hardening require a separate deployment review and authorization. They do not block the explicitly local/private integration plan and are not implicit in the existing static UI hosting approval.

The route namespace, standard client ID, resource audience/scope, synthetic resource, lifetimes and event limits above are accepted choices for this APPROVED local/private change. The owner's explicit 2026-11-11 decision, not earlier planning-file confirmations, authorizes implementation. All runtime verification remains pending.

## Technical References

- [OAuth Security BCP, RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html)
- [PAR, RFC 9126](https://www.rfc-editor.org/rfc/rfc9126.html)
- [Keycloak Server Administration Guide](https://www.keycloak.org/docs/latest/server_admin/index.html)
- [Spring Security 6.5 Resource Server JWT](https://docs.spring.io/spring-security/reference/6.5/servlet/oauth2/resource-server/jwt.html)
- [HAPI FHIR authorization](https://hapifhir.io/hapi-fhir/docs/security/authorization_interceptor.html)

Check APIs/configuration against the repository's pinned Keycloak, Spring Boot/Security, and HAPI versions during implementation; these references do not authorize dependency upgrades.
