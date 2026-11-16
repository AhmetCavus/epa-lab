# Tasks 5.1–5.5 — Standard browser authentication lifecycle

**Date:** 2026-11-12. **Scope:** existing NestJS auth-client, local/private backend only.
**Result:** scoped acceptance passed; progress **27/50** after checking tasks 5.1–5.5.
Stop after task 5.5. Tasks 6 onward remain unchanged.

## Baseline and implementation boundary

The checkout began clean on `main`, tracking `origin/main`, at
`87238023306e1d0867c92d517ad2aea5c63e606c`. OpenSpec reported the existing repository root,
`spec-driven`, `ready`, and 22/50 complete. The canonical HAPI submodule was clean at
`d609c23ae82cbd4f9cd5da26e09306b24029d131` and remains untouched.

The existing `AuthorizationModule`, `AuthorizationService`, discovery/transport/token/
ID Token services and `BrowserLoginStore` are reused. Standard state is a separate namespace
owned by the same store; there is no second BFF, persistence service, authentication framework
or new dependency. The shared opaque-cookie parser was extracted without changing ePA's
parsing rules. Existing ePA routes, cookies, PAR requirements and response contracts remain.

The [backend guide](../../../services/auth-client/README.md) documents the settings, canonical
host, cookies, DTO, recovery and local logout. Active status notes in the root README,
system context and infrastructure guide now distinguish this verified backend lifecycle
from pending SPA/resource/event work. Historical verification reports and ADRs are preserved.

No React, HAPI, Compose, dependency/lockfile, `.env`, public routing or deployment change was
made. The standard profile remains disabled by default. Existing containers were not replaced
or restarted. `/api/oauth/resource` and `/api/oauth/runs/:runId/events` remain unimplemented.
No teaching-event API or Resource Server authorization acceptance is claimed.

## Task 5.1 — Bounded contexts, transactions and runs

- Standard contexts, runs and attempts each cap at 1000; the state index cannot outgrow
  attempts. Ordinary admission checks happen before external discovery/exchange and do not
  evict valid state. Collection exhaustion does not prevent authenticated logout/rotation.
- Pending/preparing/in-flight attempts expire within ten minutes. Contexts and runs retain
  the original fifteen-minute context deadline. Authentication is additionally capped by
  validated token expiry. Reads, retries, authentication and logout never renew retention.
- Runs have internal random ownership independent of public run IDs. Context and anti-CSRF
  values rotate on authentication/logout, invalidating old IDs while preserving only owned,
  eligible safe history. Standard and ePA cookies/state cannot authorize each other.
- One-time consumption precedes exchange. Restart loses process memory; unknown/expired old
  cookies receive fresh anonymous state, and callbacks fail safely without upstream exchange.
- Expiry prunes credentials and cancelled/expired transaction secrets. No raw identity claim
  set is retained in standard browser state. Internal outcome history caps at 100 entries;
  it contains closed outcomes/times only and is not a teaching trace.

Focused storage tests verify deadlines, token expiry, rotation, restart, all collection bounds,
capacity recovery, supersession, cross-browser ownership and logout under full collections
and exhausted/failing history storage.

## Tasks 5.2–5.4 — Login, callback and minimal session

`GET /api/oauth/login` uses only the server-selected `playground-standard` profile and
registered `playground-oidc` client. Each attempt gets fresh correlation, S256 material and an
owned run. It redirects directly to discovered authorization metadata without PAR.
Query-selected client/issuer/profile/return settings are rejected before provider contact.

The host-only `playground_context` cookie is HttpOnly, SameSite=Lax, scoped to `/api/oauth`
and limited to the original context deadline. `playground_login` has the same attributes,
is scoped to `/api/oauth/callback` and expires with the pending attempt. HTTPS configuration
sets Secure; explicit private HTTP development does not. Tests verify cookie scope, remaining
lifetime, separate ePA names and HTTPS flags. No new credentialed CORS policy is enabled.

`GET /api/oauth/callback` validates query shape, optional issuer, state and both browser
bindings, consumes once, then exchanges using the stored profile/verifier and existing real
OIDC validation. It synchronously rechecks eligibility after asynchronous exchange/validation
before committing. Success rotates the context; eligible success, provider denial and
exchange/validation failure return clean HTTP 303 to `/missions/oauth-oidc/workspace`.
Unowned/stale callbacks return 403 without Set-Cookie or another run's mutation; malformed
queries return 400. Recovery requires a fresh login on the canonical host/same process.

HTTP tests cover missing/wrong/duplicate cookies, another browser, wrong host/issuer,
malformed queries, denial, exchange failure, invalid nonce, replay, expiry, process restart
and concurrent callbacks. The existing signed-token validation matrix remains active.

`GET /api/oauth/session` returns only `authenticated`, nullable authentication `expiresAt`,
`csrfToken`, and nullable owned `currentRun`. The current-run allowlist is `runId`, `outcome`,
original `expiresAt`, and `observationsAvailable: false`. No identity claims, bearer tokens,
refresh/ID tokens, cookie values, state, nonce, verifier or provider error details are returned.
Run IDs alone grant no access. Anonymous/token-expired/context-expired cases and unchanged
ePA `/session` responses are verified. All standard handlers send no-store/no-cache and
no-referrer headers. Session restoration repeats a read without repeating authorization.

## Task 5.5 — Local logout and asynchronous cancellation

`POST /api/oauth/logout` requires exact configured Origin and the current context's
`X-Playground-CSRF` value. GET logout, missing/foreign/non-exact Origin, missing/wrong/cross-
context CSRF and old identifiers are rejected without affecting current authentication.
Valid logout removes server-held credentials, cancels all bound preparing/pending/in-flight
attempts and rotates to anonymous viewing ownership. It retains eligible safe current-run
metadata under the original deadline, with no resource permission.

Deterministic HTTP races pause discovery, token exchange and real ID Token validation
separately, perform logout, then release the callback. Each stale operation is rejected,
issues no stale cookie and cannot restore authentication. Pending cancellation rejects before
exchange. Duplicate concurrent callbacks permit only one exchange. Other browsers and ePA
remain unaffected.

Cleanup uses the existing context slot and precedes optional recording. Tests fill collections
and the 100-entry history, or make the recorder throw: credentials are removed, attempts are
cancelled and rotation succeeds anyway. History failure marks internal completeness
unavailable; no event, sequence or timestamp is fabricated. `observationsAvailable` remains
false because group 7 has not been implemented.

Local logout makes no provider revocation or Keycloak logout call. Real-provider verification
confirms Keycloak SSO can authenticate a subsequent fresh run without another password entry.

## Commands and results

Run from the repository root with Node **24.20.0** and pnpm **10.34.6**:

```bash
git status --short --branch
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
corepack pnpm test:integration
corepack pnpm lint
git diff --check
```

| Check                                          | Actual result                                                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| TypeScript typecheck and build                 | Pass                                                                                                               |
| Existing plus new unit/HTTP suites             | **311 tests pass, 12 suites**; includes ePA/PAR/browser demo and signed-token regressions                          |
| Real private Keycloak integration              | **17 tests pass, 3 suites**; existing 15 plus two full standard HTTP lifecycle cases                               |
| ESLint and repository formatting               | Pass, no warnings                                                                                                  |
| Local documentation links/anchors and commands | 184 local links across 27 documents, 27 shell blocks, 74 package-command references and 16 Compose references pass |
| OpenSpec strict validation                     | Pass; only 5.1–5.5 newly checked, resulting **27/50**                                                              |
| Whitespace                                     | `git diff --check` passes                                                                                          |

Tests were executed with logs redirected to mode-0600 files under
`/tmp/epa-001-lifecycle/`; only counts/status summaries were printed. The disclosure assertions
scan actual passwords, client secrets, Basic headers, codes, PKCE verifiers, token-request
bodies, state/nonce, cookies and returned tokens without printing their values. Session JSON
is checked against an exact minimal allowlist; anti-CSRF material is excluded from logs.

Two verification-helper issues were corrected before final success: an exact cookie
`Max-Age=900` expectation ignored elapsed request processing, and the provider cookie jar
treated cleared/empty cookie values as secrets matching every response. Lifetime assertions
now check remaining bounds, and cleared provider cookies are deleted. The initial unit run
was 308/309; the initial real integration run was 15/17. Final runs include all new cases and
the strengthened credential-disclosure assertions above.

### Real-provider setup and practical limits

The integration command requires the existing `.env`, configured private Keycloak realm,
both registered clients and server-side admin settings for disposable identities. The new
suite creates only a fully fictional temporary user and deletes it afterward. It enables
standard settings only in its test configuration, starts an ephemeral listener explicitly
on `127.0.0.1`, and navigates the real Keycloak login with a temporary cookie jar.

The registered callback is captured in memory and submitted to that isolated listener with
the canonical Host header; it is never followed to the running deployed auth-client or SPA.
The suite verifies direct no-PAR login, real PKCE exchange/OIDC validation, clean 303, a fresh
HTTP request restoring the session with the same cookie, replay rejection, exact-Origin
rejection, local logout, old-cookie/CSRF rejection and provider SSO independence. There is no
mock fallback. The existing real code-expiry test retains the provider's actual code lifetime.

This verifies backend HTTP/browser-cookie behavior, not a React browser reload or an
end-to-end runnable mission. Browser navigation still contains the protocol-required code
and state until the clean callback redirect; neither is returned in the session DTO or
routine logs. The public Mission Control remains fixture-only.

### Preservation and tracking checks

The following read-only comparison commands were run after the integration tests:

```bash
KEYCLOAK_ADMIN_URL=http://127.0.0.1:5555 node --env-file=.env /tmp/epa-001-lifecycle/verify-keycloak.mjs
python3 /tmp/epa-001-lifecycle/verify-preservation.py
python3 /tmp/epa-001-lifecycle/check-links.py --report /tmp/epa-001-lifecycle/links-final.json
python3 /tmp/epa-001-lifecycle/check-commands.py
OPENSPEC_TELEMETRY=0 npm exec --offline --yes --cache /tmp/epa-001-task24-npm-cache --package @fission-ai/openspec@1.14.1 -- openspec validate 001-oidc-pkce --strict
OPENSPEC_TELEMETRY=0 npm exec --offline --yes --cache /tmp/epa-001-task24-npm-cache --package @fission-ai/openspec@1.14.1 -- openspec instructions apply --change 001-oidc-pkce --json
```

The existing temporary documentation validators were adapted under the task's temporary
directory to include this report. For their manifest/service/path assertions, all four
resolved Compose configurations were refreshed without printing expanded credentials:

```bash
umask 077
docker compose --env-file .env -f infrastructure/docker-compose.yml --profile backend config --format json > /tmp/epa-001-lifecycle/backend-config.json
docker compose --env-file .env -f infrastructure/docker-compose.host.yml config --format json > /tmp/epa-001-lifecycle/host-config.json
docker compose -f infrastructure/docker-compose.playground.yml config --format json > /tmp/epa-001-lifecycle/playground-config.json
docker compose --env-file .env -f infrastructure/docker-compose.integration.yml --profile integration config --format json > /tmp/epa-001-lifecycle/integration-config.json
```

All four pass. These are configuration reads; no service lifecycle action was run. The
temporary preservation helpers compare saved pre-task snapshots and print only results.

Keycloak's pre/post digest matches for the existing realm, clients/secrets, policies/profiles,
users and role/group mappings. The standard client/scopes retain their IDs, definitions,
secret and assignments; no disposable lifecycle user remains. Existing ePA required-PAR
policy and real flow continue to pass. No realm recreation, volume operation or migration
was needed.

All **45 original containers** retain IDs, images, creation/start times, mounts, networks and
port bindings. Docker volume and network inventories match. All **73 protected file hashes**
match, including fixture UI/assets, ADRs, historical verification/readiness records, `.env`,
Keycloak verification tooling, host manifest and public Traefik routing. HAPI HEAD/tree remain
unchanged and clean. No Docker lifecycle command was executed.

Apply instructions were refreshed and each returned source checkbox verified before marking
5.1, 5.2, 5.3, 5.4 and 5.5 complete individually; progress was checked after each. The task-6+
slice remains byte-identical. There is no remaining blocker within tasks 5.1–5.5. SPA wiring,
resource access/authorization and teaching observations remain outside this completed scope.
