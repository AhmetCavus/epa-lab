# Tasks 4.1–4.4 — Auth-client profile separation

**Date:** 2026-11-12. **Result:** scoped acceptance passed; progress **22/50** after checking
tasks 4.1–4.4. Stop before task 5.1.

## Baseline and scope

The checkout began clean on `main`, tracking `origin/main`, at
`f106c88a210b9d6f0c8a2dd9894f54ff3a98fe63`. OpenSpec reported the existing repository root,
`spec-driven`, `ready`, and 18/50 tasks complete. The canonical HAPI submodule remained clean
at `d609c23ae82cbd4f9cd5da26e09306b24029d131` throughout this scope.

Only the existing NestJS auth-client and its profile configuration, tests and relevant
documentation/wiring were extended. The [profile guide](../../../services/auth-client/README.md)
documents the internal API and settings. Existing OAuth client/transport/discovery/token
services are reused; no provider registry, extra OAuth service or dependency was added.
The Keycloak registration from [group 3](keycloak-verification.md) is unchanged.

No standard browser route, session/cookie lifecycle, logout, run storage, UI integration,
HAPI authorization or public routing was implemented. Standard initiation returns a
server-only transaction/context; it does not store a browser login or create a session.
Existing ePA browser/session behavior is preserved. Tests confirm `/api/oauth/*` remains
unimplemented. Historical verification/readiness reports and ADRs are unchanged.

## Task 4.1 — Validated fixed profiles

- `epa-par` retains all existing `OIDC_*` settings, routes, issuer/redirect allowlisting and
  required PAR behavior. Legacy-only configuration still works.
- `playground-standard` uses the separately registered `playground-oidc`, separate secret,
  exact callback and `openid demo.fhir.read`, with the configured `OIDC_ISSUER` shared.
- `PLAYGROUND_OIDC_ENABLED=false` is the default. Enabled settings require a complete,
  separate secret/client/callback and exact `PLAYGROUND_APP_ORIGIN`; errors contain field
  names only. Existing private-HTTP opt-in rules still apply.
- The fixed selector is called by trusted server code. Login query attempts are rejected;
  headers and extra callback fields cannot select credentials, issuer or callback. The
  ePA callback still checks its `iss` and uses its stored ePA context.
- `.env.example`, non-destructive `env:init` defaults and auth-client Compose inputs document
  the settings. The existing `.env` was not modified and no running container was updated.

Compiled actual `AppModule` probes passed in legacy and enabled modes without opening a
listener. An incomplete enabled mode failed safely and omitted the invalid secret value.
The existing three environment/Keycloak configuration tests passed after adding the defaults.

## Task 4.2 — Discovery appropriate to the profile

Standard metadata validates code, S256, RS256 and `client_secret_basic` support plus trusted
authorization/token/JWKS endpoints, without requiring or retaining PAR metadata. ePA still
requires a valid PAR endpoint. Used endpoints retain safe transport, configured-issuer
origin, credential/query/fragment restrictions and bounded existing HTTP transport.

Cache and in-flight identity include profile ID and issuer. Tests verify no-PAR standard
metadata, invalid/untrusted endpoints/capabilities, separate profiles/issuers, TTL, concurrency,
failure retry and no ePA fallback to standard acceptance. Signing-key cache identity includes
issuer and JWKS URI; client-dependent token checks are repeated when keys are shared.

## Task 4.3 — Direct standard requests and preserved PAR

`AuthorizationService.initiateStandard()` reuses the existing state/nonce/verifier generator
and S256 derivation. It builds the discovered authorization URL with the fixed client, exact
callback, `response_type=code` and standard scope; it neither calls PAR nor writes browser
storage/session state. Repeated attempts use fresh transaction values.

ePA still pushes PAR and returns only `client_id` and the issued `request_uri`. Its header,
allowlist, request-ID, browser login/callback and session regression contracts pass. Actual
standard integration completed without a PAR request; ePA completed through PAR.

## Task 4.4 — Stored transaction context and validation

Each bound transaction captures immutable profile ID, issuer, client identity and exact
callback, without copying the client secret. Token exchange checks the caller's expected
profile against that captured context/current configuration, derives the secret/callback
from it and rejects mismatches before sending credentials. Metadata is revalidated before
token/key requests; inconsistent stored PKCE material is rejected.

The reused ID Token boundary validates actual RS256 signatures/trusted keys and the bound
issuer, client audience/authorized party, nonce, lifetime and optional Access Token hash.
Both profiles have focused real-cryptography positive/negative cases: other-client/resource
audiences, wrong issuer/nonce/authorized party/hash, expiry/missing claims/future iat/nbf,
forged signatures, HMAC/unsigned JWTs, weak/unusable/ambiguous signing keys, incomplete token
responses, altered context/endpoints, and profile substitution. Cached issuer keys do not
cache acceptance of a different client's token. Existing key-rotation tests still pass.

## Commands and actual results

Run from the repository root with the existing Node 24/pinned pnpm toolchain:

```bash
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
corepack pnpm test:integration
corepack pnpm lint
npm run keycloak:test
PROFILE_STARTUP_MODE=legacy node --env-file=.env /tmp/epa-001-profiles/startup.cjs
PROFILE_STARTUP_MODE=enabled node --env-file=.env /tmp/epa-001-profiles/startup.cjs
PROFILE_STARTUP_MODE=incomplete node --env-file=.env /tmp/epa-001-profiles/startup.cjs
```

| Verification                                    | Actual result                                                                                                                                                                                 |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth-client typecheck and build                 | Pass                                                                                                                                                                                          |
| Unit/HTTP suite, including existing regressions | **266/266**, ten suites                                                                                                                                                                       |
| Real Keycloak integration                       | **15/15**, two suites; approximately 63.5 seconds                                                                                                                                             |
| Existing ePA integration cases within that run  | **6/6**, including browser callback/session and mandatory PAR                                                                                                                                 |
| New real profile cases                          | **9/9**: validated Nest composition, direct standard exchange, pre-transport profile rejection, ePA exchange, wrong-client codes in both directions, wrong verifier, replay and actual expiry |
| Expired provider codes                          | Standard and ePA codes both rejected after the unchanged **60-second** lifetime; no realm lifetime changes                                                                                    |
| Environment/configuration workflow              | **3/3** tests pass; existing values retained                                                                                                                                                  |
| Compiled startup probes                         | Legacy/enabled pass; incomplete enabled configuration rejected without disclosing values; no listeners                                                                                        |
| Routine auth-client log scans                   | Unit and real integration Logger captures exclude collected secrets, codes, verifiers, state/nonce, cookies and tokens                                                                        |
| Repository ESLint/Prettier                      | Pass                                                                                                                                                                                          |

The new real suite uses the production configuration/authorization/token services and HTTP
transport against the existing private Keycloak. It provisions one fully fictional temporary
identity and removes it afterward. Provider callbacks are intercepted in memory, never sent
to a new BFF route or SPA. Wrong-client/PKCE/replay/expiry requests receive actual provider
HTTP 400 failures; these are observed outcomes, not a claim of tracing provider-internal checks.
There are no mocks or silent skips in that integration suite. Raw test output is retained
only in mode-0600 local files; no token/body/callback dump is printed in the verification summary.

All four Compose configurations were checked read-only with `config --quiet`: backend,
host, fixture Playground and isolated HAPI integration. Expanded JSON stayed in private files.
The auth-client's standard enablement resolves to `false` by default. No Docker build/start/stop/down
or container replacement command was applied to the existing stacks.

## Preservation and completion

The private realm's original configuration/client/user/role/group/policy digest matches its
baseline. The standard client definition, credentials, scopes and IDs still match group 3's
source and migration journal. The temporary identity is removed. All **45 original Docker
containers** retain their IDs, images, creation/start times, mounts, networks and bindings;
the volume set and original network identities are unchanged.

All **72 protected file hashes** match, covering the fixture UI, existing historical reports,
ADRs, `.env` and hosting/routing files. HAPI HEAD/tree are unchanged. No dependency/version/
lockfile change or public deployment was made. Local links/commands, formatting, diff checks
and strict OpenSpec validation pass. The local documentation scan checks 177 links/anchors
across 26 documents; command checks cover 24 shell blocks, 69 package-command references
and 12 Compose-command references. Real negative-test assertions project only safe error
status fields, so an unexpected successful exchange cannot make Jest print a token response.

Local evidence is under `/tmp/epa-001-profiles/`: `unit.log`, `integration.log`, compiled
startup probe, private Compose configuration and Docker/Keycloak preservation summaries.
Only tasks 4.1–4.4 become checked; task 5.1 onward remains unchanged. No remaining blocker
for this scope. Standard browser/session, frontend and Resource Server work remains pending.
