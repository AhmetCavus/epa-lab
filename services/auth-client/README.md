# Auth-client profiles and browser lifecycle

The existing NestJS package remains `@epa-auth-lab/authorization`. It now supports two fixed,
server-selected OAuth/OIDC profiles through the existing authorization, discovery, transport,
token and ID Token services. There is no provider registry or second OAuth client service.

| Profile               | Configuration                                                                    | Authorization                                                                         |
| --------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `epa-par`             | Existing `OIDC_*` credentials, issuer and redirect allowlist                     | Required PAR; browser URL contains only `client_id` and provider-issued `request_uri` |
| `playground-standard` | Separate `PLAYGROUND_OIDC_*` credentials/callback; same configured `OIDC_ISSUER` | Direct Authorization Code + PKCE S256 with `openid demo.fhir.read`; no PAR call       |

The existing `/login`, `/callback`, `/session` and
`/epa/authz/v1/send_authorization_request_fdv` routes retain their ePA contracts. Query,
header and callback values cannot select credentials or a profile. Existing login query
parameters are rejected; callback processing uses only the stored ePA transaction context.
See [EPA.md](../../EPA.md) for the preserved demo and [Keycloak setup](../../infrastructure/keycloak/README.md)
for client registration and migration.

## Validated settings and opt-in

Legacy-only configuration still works. `PLAYGROUND_OIDC_ENABLED` defaults to `false`; unused
standard settings do not become prerequisites for the ePA demo. To enable the internal
standard capabilities in a local/private process, supply complete settings:

```dotenv
PLAYGROUND_OIDC_ENABLED=true
PLAYGROUND_APP_ORIGIN=http://localhost:3000
PLAYGROUND_OIDC_CLIENT_ID=playground-oidc
PLAYGROUND_OIDC_CLIENT_SECRET=
PLAYGROUND_OIDC_REDIRECT_URI=http://localhost:3000/api/oauth/callback
```

The blank example secret must be filled server-side by the existing `env:init` workflow.
Existing ePA values retain their meanings. The standard secret must be at least 32 characters
and differ from the ePA secret. Its fixed client ID and exact callback must also be separate
from ePA. The callback is exactly `${PLAYGROUND_APP_ORIGIN}/api/oauth/callback`, with no
query, fragment or wildcard. Incomplete/invalid enabled configuration fails at startup with
field names only; rejected values and credentials are not included in errors.

The existing transport rules apply: HTTPS, or loopback HTTP; private IPv4 HTTP requires the
explicit `OIDC_ALLOW_PRIVATE_NETWORK_HTTP=true` development opt-in. For LAN use, set the
application origin and registered callback to the same private application host. The issuer
is still the server-configured `OIDC_ISSUER`, never a callback/query override. The canonical
application host must match login, callback and session requests; forwarded-host input does
not override it. These settings enable the backend handlers, not SPA integration or routing.

`env:init` adds missing standard defaults without rotating existing values. Compose passes
the namespaced settings to auth-client, disabled by default. Source configuration changes
do not update a running container. Tasks 4.1–5.5 were verified in private test processes;
the running deployment, its `.env`, port bindings and public fixture-only UI were preserved.

## Discovery and transaction binding

Standard discovery requires trusted authorization/token/JWKS endpoints, code support, S256,
RS256 ID Tokens and `client_secret_basic`; PAR metadata is neither required nor retained.
ePA still requires a valid PAR endpoint. Every used endpoint must have safe transport, no
credentials/query/fragment, and the configured issuer's origin. Provider endpoints are
discovered, not assembled from guessed Keycloak paths.

Successful discovery and in-flight work are cached separately by fixed profile ID and issuer.
Failures do not poison a later retry or permit standard metadata to satisfy ePA validation.
JWKS cache identity includes the issuer and validated JWKS URI; signature and client-dependent
claims are checked for every token, including when both profiles share cached signing keys.

`AuthorizationService.initiateStandard()` returns a server-only authorization URL, metadata
and transaction. It reuses the existing random state/nonce/verifier generation and S256
challenge derivation. It accepts no caller-selected client settings and creates no browser
session, binding cookie or pending-login entry. Retries generate fresh transaction values.

The bound transaction captures immutable profile ID, issuer, client identity and exact
callback. It stores no client secret. `TokenService.exchange` requires a trusted caller's
expected profile ID, checks it against the captured context/current configuration, then derives
credentials and callback from that binding. It rejects altered profile/issuer/client/callback
or inconsistent stored PKCE material before sending credentials. Metadata is revalidated
before exchange/key retrieval. A code issued to another client still fails at the provider.

`IdTokenService` uses that same binding for issuer, client audience/authorized party and nonce,
with the existing real signature/RS256/trusted-key, lifetime and optional `at_hash` checks.
The existing bounded ePA pending store accepts only ePA context at consumption. Standard
browser state uses its own namespace inside that same process-local store, with separate
cookies and no ePA credential/session fallback.

## Standard browser contract

The following handlers are implemented only when the standard profile is enabled:

| Method and route          | Behavior                                                                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/oauth/login`    | Top-level browser navigation creates a fresh owned run and correlated standard transaction, sets opaque cookies and redirects directly to the discovered Keycloak authorization endpoint with code/S256; no PAR request. |
| `GET /api/oauth/callback` | Checks state, browser cookies, optional issuer and the stored profile; consumes once before exchange, validates OIDC and returns HTTP 303 to `/missions/oauth-oidc/workspace`.                                           |
| `GET /api/oauth/session`  | Returns minimal authentication/expiry, current owned run and context-bound logout anti-CSRF material. Creates an anonymous context if the old one is missing, expired or lost after restart.                             |
| `POST /api/oauth/logout`  | Requires the exact configured `Origin` and current `X-Playground-CSRF` header. Drops credentials, cancels context-bound attempts and rotates to an anonymous context.                                                    |

Login, session and logout reject query parameters, including caller-selected clients,
issuers and return URLs. Callback accepts only its documented OAuth/OIDC response fields.
Correlated provider denial or exchange/validation failure also returns to the fixed clean
Workspace URL; the owned run contains only a safe outcome. Malformed queries return 400;
missing, mismatched, replayed, expired or cancelled correlation returns 403 without issuing
cookies or changing another run. Wrong-host requests return 403. A lost transaction requires
a fresh login on the canonical host and same process; retrying a raw callback cannot recover it.

All four handlers send `Cache-Control: no-store`, `Pragma: no-cache` and
`Referrer-Policy: no-referrer`. No credentialed CORS policy is enabled. The React Playground
does not call these handlers yet; its Workspace return remains the existing fixture view.
`/api/oauth/resource` and `/api/oauth/runs/:runId/events` are still unimplemented.

### Storage, cookies and recovery

The existing `BrowserLoginStore` owns a standard-only state object with at most 1000 contexts,
1000 runs and 1000 pending/in-flight attempts; the state lookup index is bounded by attempts.
Pending work expires after ten minutes, capped by the context's original deadline. Contexts
and runs expire within fifteen minutes of context creation. Authentication ends at the
earlier validated token expiry or context deadline. Reads, login retries, authentication and
logout do not extend the original context/run retention. Expiry lazily prunes state and
credentials on access; process restart loses everything safely and returns anonymous state.
Ordinary work at capacity is rejected before discovery/exchange without evicting valid work.

| Cookie               | Scope                                 | Lifetime and attributes                                                                                                |
| -------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `playground_context` | Host-only, `Path=/api/oauth`          | Remaining original context lifetime; HttpOnly, SameSite=Lax, Secure when the configured application origin uses HTTPS. |
| `playground_login`   | Host-only, `Path=/api/oauth/callback` | Remaining pending lifetime; same attributes; removed after eligible completion or logout.                              |

Use one canonical application host throughout browser navigation. Explicitly allowed private
HTTP development omits Secure; HTTPS configurations always set it. Context ID and anti-CSRF
material rotate on authentication and logout, invalidating the prior ID. Another cookie jar,
an ePA cookie or knowledge of a run ID does not authorize access. Only server memory retains
verified OAuth tokens; identity claim sets are not retained in standard browser state.

### Session DTO

The exact JSON fields are `authenticated`, `expiresAt`, `csrfToken` and `currentRun`:

```json
{
  "authenticated": false,
  "expiresAt": null,
  "csrfToken": "<opaque context-bound value>",
  "currentRun": null
}
```

Authenticated responses use an ISO expiry string. An owned current run contains only `runId`,
`outcome`, its original ISO `expiresAt` and `observationsAvailable: false`. Outcomes are
`pending`, `authenticated`, `provider-denied`, `authentication-failed`, `signed-out`,
`cancelled` or `expired`. Anti-CSRF material is returned only for same-origin application
use and belongs in the logout header, never in teaching evidence. No token, raw identity
claim, transaction state/nonce/verifier, cookie value or provider error text is returned.
The legacy ePA `/session` response is unchanged.

### Local logout and asynchronous completion

Logout is local application logout; it neither ends Keycloak SSO nor claims bearer-token
revocation. GET logout is unavailable. Missing/foreign/non-exact Origin, missing/wrong or
other-context CSRF and an old context are rejected. A successful response contains the same
minimal session DTO with `authenticated: false` and a new cookie/anti-CSRF value. The rotated
context retains only its eligible non-sensitive history under the original expiry.

Cancellation covers preparation/discovery, pending callbacks and consumed callbacks awaiting
token exchange or ID Token validation. After all asynchronous processing, eligibility is
rechecked immediately before a synchronous rotation/session commit. A stale completion
cannot restore authentication or issue cookies that overwrite the signed-out context.

Internal authentication outcome history is capped at 100 entries per run; it is not the
planned teaching-event API. Cleanup and cancellation complete even if recording throws or
history/collections are full. History failure marks internal completeness unavailable;
`observationsAvailable` remains false without invented events. Safe history never grants
resource permission. Tokens, secrets and callback queries remain outside routine logs and
frontend storage. HAPI authorization and public API routing remain separate work.

## Verification

Run from the repository root with Node 24 and the pinned pnpm:

```bash
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
corepack pnpm test:integration
corepack pnpm lint
```

Unit/HTTP tests cover disabled/enabled configuration, discovery trust/cache isolation,
direct standard versus ePA PAR construction, fresh transactions, substitution rejection,
and real cryptographically signed positive/negative ID Token cases for both profiles.
Standard lifecycle tests cover bounded storage, restart/expiry, cookie/CSRF isolation,
clean redirects, session restoration, one-time completion, logout during discovery/exchange/
validation, and cleanup despite full or failing history recording.
Existing ePA browser, replay, capacity, transport, header and log-safety tests remain in place.

Integration requires the configured private Keycloak with both registered clients and
server-side administrator settings for disposable test identities. Suites create temporary
fully fictional identities and remove them afterward. They verify real
standard/ePA code exchange, wrong-profile/code/PKCE cases, replay and expiry under the
unchanged provider code lifetime. The browser lifecycle suite starts a temporary auth-client
listener only on `127.0.0.1`, navigates the real provider login using an isolated cookie jar,
and routes the captured callback into that test listener with the canonical Host header.
It verifies HTTP session restoration on a fresh request with the same cookie, logout/old-ID
rejection and subsequent login through unchanged Keycloak SSO. It never forwards callbacks
to the existing deployed auth-client or SPA. This is HTTP lifecycle integration, not a React
browser acceptance test. Profiles are enabled only in test configuration; `.env`, registered
callbacks, existing users, containers and routing remain unchanged. There is no mock fallback
in the real integration suites.

See the [task 4.1–4.4 evidence](../../openspec/changes/001-oidc-pkce/auth-client-profiles-verification.md)
and [task 5.1–5.5 evidence](../../openspec/changes/001-oidc-pkce/browser-lifecycle-verification.md)
for actual results and preservation checks. These checks establish the backend browser
lifecycle; SPA integration, resource access/authorization and teaching events remain pending.
