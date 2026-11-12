# Auth-client profile boundary

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
is still the server-configured `OIDC_ISSUER`, never a callback/query override. No new resource
endpoint, session or CSRF behavior is configured in this step.

`env:init` adds missing standard defaults without rotating existing values. Compose passes
the namespaced settings to auth-client, disabled by default. Source configuration changes
do not update a running container. Tasks 4.1–4.4 were verified in private test processes;
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
The existing bounded ePA pending store accepts only ePA context at consumption. The standard
profile is not added to that browser session lifecycle; mission browser storage/routes and
logout remain task group 5.

No `/api/oauth/*` route is implemented here. Tokens, secrets and raw transaction data stay
inside auth-client/test processes, outside logs, teaching traces and frontend storage. HAPI
resource authorization and public API routing remain separate, unimplemented scope.

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
Existing ePA browser, replay, capacity, transport, header and log-safety tests remain in place.

Integration requires the configured private Keycloak with both registered clients. The new
suite uses a temporary fully fictional identity and removes it afterward. It verifies real
standard/ePA code exchange, wrong-profile/code/PKCE cases, replay and expiry under the
unchanged provider code lifetime. It intercepts callbacks in memory without contacting
the unimplemented mission callback or opening an application listener. It temporarily enables
the profile only in its test configuration, leaves `.env` unchanged and has no mock fallback.

See the [task 4.1–4.4 evidence](../../openspec/changes/001-oidc-pkce/auth-client-profiles-verification.md)
for actual results and preservation checks. These checks do not establish an executable
Playground mission, a new standard browser session or HAPI resource authorization.
