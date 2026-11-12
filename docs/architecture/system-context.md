# Architecture — Context & Trust Boundaries

**Status:** APPROVED FOR LOCAL/PRIVATE IMPLEMENTATION · **Version:** 0.2

**Readiness reconciliation:** 2026-11-11, change `001-oidc-pkce`, tasks 1.1–1.3 only

This document aligns with the [integration design](../../openspec/changes/001-oidc-pkce/design.md) and its two capability specifications. The owner accepted this architecture, ADR-0001/ADR-0002, the reconciled UX/visual baseline and revised specs on 2026-11-11, approving `001-oidc-pkce` tasks 2–9 for local/private implementation. The [readiness review and owner approval record](../../openspec/changes/001-oidc-pkce/readiness-review.md#consolidated-owner-approval-summary) records that explicit decision. Public real authentication remains unauthorized.

**Implementation alignment, 2026-11-12 (task 2.6):** Repository/integration tasks 2.1–2.5 are verified. The current-state notes below reflect their results; the accepted first-mission API, session, resource policy and event contracts remain planned. See [runtime evidence](../../openspec/changes/001-oidc-pkce/repository-verification.md#task-25-completion--authorized-health-prerequisite-private-publication-and-lifecycle-2026-11-12) and the [private run guide](../../infrastructure/README.md).

**Keycloak alignment, 2026-11-12 (tasks 3.1–3.3):** The separate standard client, audience and
optional permission scope are configured and verified in the existing private realm, with
fresh setup, idempotent migration and rollback evidence. See the [Keycloak guide](../../infrastructure/keycloak/README.md)
and [verification record](../../openspec/changes/001-oidc-pkce/keycloak-verification.md).
The auth-client profiles and backend standard browser lifecycle are now verified under tasks 4.1–5.5. See the [backend contract](../../services/auth-client/README.md), [profile verification](../../openspec/changes/001-oidc-pkce/auth-client-profiles-verification.md) and [browser lifecycle evidence](../../openspec/changes/001-oidc-pkce/browser-lifecycle-verification.md). SPA integration, HAPI authorization/resource access and teaching-event APIs remain planned; the deployed fixture UI and backend containers are unchanged.

## Components and current implementation boundary

| Component                 | Current repository state                                                                                                          | Proposed local integration responsibility                                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/playground`         | React SPA / Mission Control; fixture-only OAuth preview and conceptual ePA workspace                                              | Preserve the Catalog/Workspace design; add mission-owned browser navigation, session/run restoration and safe event projection under the approved change |
| `services/auth-client`    | Existing ePA PAR/browser demo plus verified standard/ePA profiles and standard login/callback/session/local logout                | Add fixed resource access and owned teaching events without changing ePA contracts                                                                       |
| `infrastructure/keycloak` | Existing realm/ePA required-PAR client; separate standard S256 client, audience and optional scope verified                       | Reuse the registered standard client for BFF integration; preserve ePA client and policy                                                                 |
| `services/res-server`     | Canonical HAPI FHIR Git submodule; build/private connectivity verified; JWT authentication with exact data-free health exceptions | Independently validate mission bearer credentials and permission for one synthetic FHIR read; deny undeclared data operations                            |

No new BFF, Resource Server, Keycloak deployment or realm is proposed. Tasks 2.1–2.5 repaired the obsolete tooling/build/Compose paths, preserved unique work while removing the duplicate HAPI gitlink, and verified the canonical private integration. The narrow dependency and health prerequisites do not establish the accepted mission's audience/permission/operation policy; tasks 6.1 and 6.4 remain incomplete. Stable package `@epa-auth-lab/authorization`, Keycloak client `epa-auth-server`, API-client folder `epa-authorization` and existing ePA endpoint identifiers remain valid.

## Logical architecture for the proposed first runnable mission

```mermaid
flowchart TB
  H[Human user] --> SPA[apps/playground: Browser / React SPA]
  SPA <-->|Same-origin application cookie and safe DTOs| BFF[services/auth-client: NestJS BFF / OAuth Client]
  SPA <-->|Browser navigation for authentication| KC[infrastructure/keycloak: AS + IdP]
  BFF <-->|Back-channel code exchange| KC
  BFF -->|Server-held Access Token| RS[services/res-server: HAPI FHIR Resource Server]
  RS -.->|Trusted issuer keys / JWKS| KC
```

| Role                  | Component                             | Boundary                                                                                        |
| --------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Resource Owner / User | Human user                            | Grants access; not the SPA                                                                      |
| User Agent / UI       | Browser hosting React Mission Control | Follows redirects and displays Keycloak login; holds no JavaScript-accessible OAuth credentials |
| OAuth/OIDC Client     | NestJS auth-client / BFF              | Confidential client, transaction owner and server-side token holder                             |
| Authorization Server  | Keycloak                              | Issues authorization codes and tokens                                                           |
| Identity Provider     | The same Keycloak deployment          | Performs authentication; a separate logical OIDC role, not another server                       |
| Resource Server       | HAPI FHIR                             | Independently validates Access Token and resource permission                                    |

IdP is not one of the four OAuth 2.0 roles. Browser redirects and direct BFF-to-provider requests are different channels.

## Separate standard and existing ePA profiles

The implemented auth-client `playground-standard` profile uses confidential Keycloak client `playground-oidc` in the existing realm. The Keycloak side verifies direct Authorization Code + PKCE S256, `openid demo.fhir.read` and **no PAR requirement**. Standard discovery is verified without PAR metadata; the existing ePA path still requires it. Both paths reuse the current transaction/transport/token services, with credentials and ID Token checks bound to captured server-selected profile context. Standard browser handlers use an isolated namespace in the existing process-local store. The verified Access Token audience is `playground-fhir`; ID Tokens retain only the OAuth client audience. An `openid`-only grant retains the resource audience without `demo.fhir.read`, ready for later permission-denial tests.

The existing `epa-par` profile retains its current client configuration, PAR discovery requirement, `require-par` marker and required-PAR policy. Standard configuration must not weaken or bypass that policy.

Existing implemented routes remain separate:

| Method and route                                   | Preserved ePA behavior                                                                                                                           |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /epa/authz/v1/send_authorization_request_fdv` | Header-based stateless PAR smoke operation returning a redirect; it does not establish the browser transaction needed by the callback            |
| `GET /login`                                       | Browser-bound ePA login using PAR                                                                                                                |
| `GET /callback`                                    | Correlates and consumes that browser transaction, exchanges/validates tokens, establishes the existing ePA session and returns 303 to `/session` |
| `GET /session`                                     | Existing ePA demonstration session response                                                                                                      |

Preserve existing ePA cookies, response contracts and tests. A smoke redirect or successful Keycloak authentication alone does not establish an application session; the originating browser binding and tracked callback transaction must also be valid. Mission Control's ePA entry stays conceptual, despite this separate existing backend demonstration. Comparing both flows in the UI is deferred.

## Standard browser API and redirects

These routes belong to the existing auth-client. Login, callback, session and local logout
are implemented and verified in private test processes when the standard profile is enabled.
Resource access and owned teaching-event reads below remain planned and return 404.
The [backend guide](../../services/auth-client/README.md#session-dto) documents the implemented
minimal DTO; `observationsAvailable` remains false until teaching observations exist.

| Method and route                    | Contract                                                                                                                                                                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/oauth/login`              | Normal top-level browser navigation; create a fresh run and one-time standard transaction, set browser binding, redirect to Keycloak                                                   |
| `GET /api/oauth/callback`           | Check callback shape, state, browser binding, stored profile and token validation; consume once; eligible completion returns a clean 303 to the fixed OAuth Workspace                  |
| `GET /api/oauth/session`            | Minimal auth/expiry/current-run outcome and context-bound logout anti-CSRF value; no tokens, raw identity claims or transaction secrets                                                |
| `POST /api/oauth/logout`            | Exact configured Origin and context-bound anti-CSRF checks; invalidate local authentication, cancel bound attempts, remove credentials and rotate to unauthenticated viewing ownership |
| `GET /api/oauth/resource`           | Require standard application authentication; call only the configured synthetic HAPI read using its server-held Access Token; return a bounded safe result                             |
| `GET /api/oauth/runs/:runId/events` | Require browser viewing ownership and unexpired run; return versioned allowlisted event projections                                                                                    |

The fixed return is `/missions/oauth-oidc/workspace`. Correlated success, provider denial and exchange/validation failure return there with safe server-side outcome state, without callback parameters. An uncorrelated callback grants no run access. Do not accept caller-selected clients, issuers, callback settings, upstream URLs or `returnTo` destinations.

Login and callback use the same canonical application host and running auth-client instance. Missing/mismatched binding, unknown/expired/lost transactions, cross-profile substitution, replay and concurrent duplicate completion fail safely. A restart loses process-local context and requires a fresh login. A fresh session request with the same cookie restores authentication/current-run state without repeating protocol actions. SPA reload handling and owned-event reads remain later work.

## Sequence (illustrative, not an observed trace)

```mermaid
sequenceDiagram
  actor U as User
  participant W as Browser / React SPA
  participant B as auth-client / OAuth Client
  participant K as Keycloak / AS + IdP
  participant R as HAPI / Resource Server
  U->>W: Start standard authentication
  W->>B: GET /api/oauth/login (top-level navigation)
  Note over B: Store one-time profile-bound transaction, state, nonce and PKCE binding
  B-->>W: Redirect to discovered authorization endpoint
  W->>K: Follow authorization redirect
  Note over K: Authentication and PKCE checks are internal, not BFF-observed
  K-->>W: Redirect to registered callback
  W->>B: GET /api/oauth/callback
  Note over B: Correlate browser and consume transaction once
  B->>K: Code exchange at discovered token endpoint (back channel)
  K-->>B: Token response
  Note over B: Validate tokens; recheck original context/attempt after async work before synchronous session commit
  B-->>W: Rotate HttpOnly cookie; 303 /missions/oauth-oidc/workspace
  W->>B: GET /api/oauth/session and owned run events
  U->>W: Read synthetic resource
  W->>B: GET /api/oauth/resource with application cookie
  B->>R: GET /fhir/Basic/playground-demo with Access Token
  Note over R: Independent bearer and permission enforcement
  R-->>B: Bounded synthetic result or denial; explicit safe decision report
  B-->>W: Safe result and BFF-observed event projection
```

This sequence explains intended behavior. It does not publish callback secrets or claim Keycloak-internal checks are directly observable.

## Session, logout and asynchronous trust boundary

The BFF selects one of the two fixed profiles server-side and binds issuer, client identity, callback URI, profile and run to each pending transaction. Exchange credentials and token checks come from that stored record, never callback input. Reuse existing cryptographic/JWT libraries and preserve one-time consumption before exchange.

OAuth credentials stay in auth-client. The standard context cookie has a different name from ePA, is HttpOnly, SameSite=Lax, scoped to `/api/oauth`, and Secure under HTTPS. The callback binding cookie is callback-scoped with the ten-minute login lifetime. Rotate the context identifier on authentication and logout; invalidate the prior identifier. Authentication expires no later than token expiry.

A valid local logout must:

1. Invalidate the active standard application session and remove server-held credential references.
2. Cancel every pending login bound to that context, including a consumed callback awaiting asynchronous exchange or validation.
3. Reject a known cancelled callback before exchange. After all asynchronous work, recheck the original context and attempt for cancellation, expiry or supersession immediately before session commit. The final check and commit are one synchronous local state transition.
4. Discard credentials from a stale completion; issue no authenticated cookie and never overwrite the replacement unauthenticated viewing context.
5. Preserve other browsers and existing ePA/PAR contexts.

Logout requires the exact configured Origin and a context-bound anti-CSRF value from the same-origin session response, supplied in a header. A cookie alone is insufficient; GET never logs out. The anti-CSRF value is not teaching evidence. Local logout does not claim Keycloak SSO logout or immediate bearer-token revocation.

Context/run viewing expires within its original fifteen-minute lifetime. Bound each collection to 1000 entries and each run to 100 events. A run ID grants no access by itself. After logout, only the replacement unauthenticated context can view its eligible non-sensitive history; history grants no resource permission and logout does not renew retention.

**Cleanup is independent of trace persistence.** Capacity may reject ordinary execution before external work, but must never prevent session invalidation, login cancellation or credential cleanup, including expiry cleanup. Event append rejection, failure or exception cannot roll cleanup back. If the logout observation cannot be stored, the session still reads signed out; show observation/trace completeness as unavailable without inventing an event, timestamp or sequence.

## Independent HAPI authorization boundary

The verified baseline permits only exact GET/HEAD `/actuator/health/liveness` and
`/actuator/health/readiness` without authentication, with no health components/details.
JWT authentication remains required elsewhere, including FHIR, MCP and `/actuator/health`.
The following mission authorization requirements are still planned; passing probes or a
401 response does not establish their implementation.

The sole proposed exercise is `GET /fhir/Basic/playground-demo`, a synthetic nonclinical R4 Basic resource seeded through local/test setup, not anonymous writes. HAPI independently validates signature/key/algorithm, issuer, `playground-fhir` audience, expiry/not-before, token purpose and `demo.fhir.read`. BFF session cookies and ID Tokens do not authorize HAPI.

Return 401 for missing/invalid bearer credentials and 403 for valid credentials without permission or for undeclared data operations. Default-deny other FHIR reads, writes, searches, history, batch/transaction and data-bearing alternate endpoints, including MCP/CDS/test paths. Only explicitly reviewed data-free health/readiness exceptions are allowed. Acceptance must exercise direct HAPI requests as well as the BFF path.

The BFF forwards only its server-held Access Token to the single configured read, with time/size limits. It returns a small safe synthetic view or stable failure code; it is not an arbitrary proxy. A BFF 401 before an upstream request must not be shown as a HAPI denial.

## Safe event provenance

The version-1 discriminated event contract has stable `eventId`/`runId`, per-run `sequence`, actual `observedAt`/`observedBy`, closed `kind`, actor references, channel, outcome and per-kind allowlisted `evidence`. Unknown/unsafe fields, kinds or versions are rejected; no raw JSON fallback or false complete-trace claim. The [design's event contract](../../openspec/changes/001-oidc-pkce/design.md#6-define-a-versioned-safe-observation-contract) is canonical.

auth-client observes its own correlation/validation, exchange outcomes and received HAPI responses. An event for a HAPI response is `observedBy: auth-client` with the BFF observation time. A 200 response does not prove a list of internal security checks.

Only explicit, bounded reports from the configured HAPI endpoint may provide a nested `reportedBy: res-server` decision:

- `X-Playground-Decision`: `allowed` or `denied`.
- `X-Playground-Reason`: `demo-read-allowed`, `missing-token`, `invalid-token`, `insufficient-permission`, or `operation-not-allowed`.

Missing, malformed, unknown or conflicting report fields leave the reason unavailable. Do not invent a Resource Server timestamp or internal check list. Keycloak password validation, PKCE comparison and token creation remain **Explained / Not observable**. Actor-local observations use no network arrow. Fixtures retain their explicit labels and have no fabricated observer/time.

Teaching responses and routine application/proxy/resource logs exclude passwords, authorization codes, state/nonce, PKCE verifiers, tokens, client secrets, cookie values, raw callbacks/identity claim sets and entire HTTP bodies. Configure callback access logging to omit query strings; use no-store and safe referrer handling. The only existing browser persistence remains explicit locale preference.

## Frontend and hosting boundaries

The shell and protocol-flow capability remain mission-neutral under Accepted ADR-0003. Mission owns declarations, runtime adaptation and actions; protocol-flow renders neutral actors/events/selection through its existing public entries. Do not add a runtime plugin framework or put OAuth/ePA branches in generic controls. Preserve German-default/English behavior under Accepted ADR-0004, the two-card catalog, current artwork/layout and fixture mode.

UI Slice 001 is hosted in an isolated `apps/playground` package alongside the existing `epa-auth-lab` services. The fixture UI does not call or alter those services. Local/private backend integration has separate approval under `001-oidc-pkce`; it does not change the public hosting boundary.

On 2026-10-19, the owner authorized static UI deployment at `auth-playground.yappai.de` and registration in Yoster. The dedicated [`infrastructure/docker-compose.playground.yml`](../../infrastructure/docker-compose.playground.yml) definition builds only `apps/playground`, serves its compiled assets with Nginx and joins the existing `dev-proxy` network. Traefik's watched host configuration `../infra/traefik/dynamic/epa-lab.yml` (relative to the repository root, outside this checkout) routes the hostname to `http://epa-lab-playground:80`; public HTTPS uses the existing Cloudflare tunnel.

Since the separately authorized 2026-10-28 host setup, the root [`yappai.host.json`](../../yappai.host.json) manages the five-service [`infrastructure/docker-compose.host.yml`](../../infrastructure/docker-compose.host.yml) stack: Playground, Keycloak, auth-client, HAPI and its PostgreSQL database. Backend bindings default to loopback and may use explicitly configured private LAN addresses. Only the fixture Playground has public routing; the manifest does not authorize public backend exposure. The [isolated integration profile](../../infrastructure/README.md) uses a separate project and disposable database for verification without replacing deployed services.

Future same-origin API routing uses existing Vite/Nginx configuration for **local/private** testing under the approved change. No broad credentialed CORS policy or new gateway is needed. Public API/auth-client/Keycloak/HAPI exposure is outside this change's implementation scope and requires separate authorization. Static-hosting permission does not grant authentication deployment permission.

## Accepted scope and pending runtime verification

The owner accepted ADR-0001 and ADR-0002 and the reconciled UX/security/spec baseline on 2026-11-11, explicitly approving the complete change and local/private tasks 2–9. Readiness task 1.4 is complete; recording that approval itself started no implementation. Subsequent tasks 2.1–2.5 have verified repository/private infrastructure results, and task 2.6 aligns active documentation. Historical reports retain their original scope and results. First-mission runtime acceptance is pending and public authentication deployment remains excluded.

## Reference specifications

- [OAuth 2.0](https://www.rfc-editor.org/rfc/rfc6749)
- [PKCE](https://www.rfc-editor.org/rfc/rfc7636)
- [OIDC Core](https://openid.net/specs/openid-connect-core-1_0.html)
- [OAuth Security BCP](https://www.rfc-editor.org/rfc/rfc9700)
- [PAR, used by the preserved ePA profile](https://www.rfc-editor.org/rfc/rfc9126)
