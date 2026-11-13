# Tasks 7.1–7.6 — Private BFF resource access and safe observations

**Date:** 2026-11-12. **Scope:** only tasks 7.1–7.6 in the existing NestJS auth-client,
its configuration, focused tests and active documentation. No task 8 implementation.
**Result:** tasks 7.1–7.6 pass; **39/50 complete**. Stop after task 7.6.

## Baseline and implementation boundary

The parent checkout began clean on `main`, tracking `origin/main`, at
`56dfaea8f1fd9391644bff88aa339be2d07b6e39`. OpenSpec reported the local repository root,
`spec-driven`, `ready`, **33/50** complete. The canonical HAPI submodule was clean at
reviewed security commit `e65bafc279f02f44b19b47ca7326015886047a63` and is unchanged.

The implementation extends the existing standard browser service/controller and the
standard namespace of `BrowserLoginStore`. It adds a finite mission-specific event contract
and a fixed resource-read function, reusing the existing bounded OIDC JSON reader. There is
no additional deployed service, NestJS OAuth service/provider, provider registry or generic
event infrastructure. Existing ePA contracts and required PAR remain separate.

`PLAYGROUND_FHIR_RESOURCE_URL` is required only when the standard profile is enabled. It is
validated and captured in the server-selected profile. Non-destructive environment defaults,
the example and existing Compose passthrough include the loopback synthetic-read URL. Actual
`.env` and deployed containers are not updated; the standard profile remains disabled there.
The [backend guide](../../../services/auth-client/README.md) documents exact routes, DTOs,
per-kind evidence, observer semantics, configuration, capacity and recovery.

## Task 7.1 — Fixed protected resource operation

`GET /api/oauth/resource` accepts only the current standard server-held authentication. It
calls exactly the configured `/fhir/Basic/playground-demo` with its Access Token, fixed method
and Accept header. Caller URL/query/credentials/body settings and HEAD are refused. There
is no ePA cookie/token fallback, caller-token forwarding or upstream redirect following.

Missing, expired, signed-out and ePA-only authentication return local 401 before HAPI contact.
Actual HAPI 200/401/403 have distinct safe results; denied response bodies are discarded.
Only the known fictional Basic is accepted and projected to the three literal resource
fields `resourceType`, `id`, `code`. Metadata, unexpected fields and full bodies do not escape.
The existing configured timeout covers response/body handling; decoded JSON is capped at
65536 bytes, including chunked and compressed content. Timeout is 504; other transport,
status, content-type, JSON/shape and size failures are safe 502 classifications.

After asynchronous work the same authentication/context must still be current. In-flight
results after logout are rejected locally without restoring cookies or credentials. During
a later pending login, existing credentials/resource events belong to the original
authenticated run, rather than implying that the pending run authenticated.

## Tasks 7.2–7.3 — Strict events at actual observation boundaries

Schema version 1 is a strict discriminated union of 21 kinds. Each event has server-generated
UUID event/run IDs, contiguous per-run sequence starting at 1, actual UTC BFF observation
time, `observedBy: auth-client`, fixed actor/channel associations, closed outcome and a strict
per-kind evidence allowlist. Unknown versions/kinds/fields, caller metadata, unsupported
actors, free text, raw bodies and secret-bearing evidence are rejected. API reads validate
the complete document again; corrupted storage yields a safe error, never raw JSON.

The verified successful authorization order is:

```text
authorization-started
authorization-redirect-issued
callback-accepted
token-exchange-started
token-response-received
token-validation-started
token-validation-succeeded
session-established
workspace-redirect-issued
```

A resource read adds `resource-requested`, `resource-response-received`, then the actual
local result. Logout/expiry/cancellation and exchange/validation/provider failures have
their own bounded local observations. Exchange failures do not fabricate successful
responses/validation; failed validation never produces session success. A completion made
ineligible by logout does not relabel successful validation as a failed token check.

Redirect issuance is the observed BFF → browser instruction, with the intended destination
as literal evidence. It does not claim browser → Keycloak receipt. Actor-local checks have
no network arrow. Only owned/correlated callback work can record rejection evidence; unknown,
unowned or replayed callbacks cannot change another run. Keycloak password validation,
PKCE comparison and token creation are never emitted as observed events. See the
[event-to-observer table](../../../services/auth-client/README.md#owned-version-1-protocol-events).

## Task 7.4 — Explicit HAPI reporting

The BFF accepts only exact `X-Playground-Decision` and `X-Playground-Reason` enum pairs that
agree with the received status: 200/allowed/demo-read-allowed; 401/denied/missing-token or
invalid-token; 403/denied/insufficient-permission or operation-not-allowed. Duplicate,
missing, malformed, unknown and conflicting reports produce exactly `available: false`.
Other headers are ignored.

The containing response event is timed/observed by auth-client. Its nested report identifies
`reportedBy: res-server`; no Resource Server timestamp, claim set or internal validation list
is inferred. A local BFF authentication rejection records only `resource-rejected`, without
a HAPI request/response or Resource Server denial. The real denied cases exercise HAPI's
existing implementation, without changing its authorization policy.

## Task 7.5 — Owned, bounded history

`GET /api/oauth/runs/:runId/events` requires an unexpired browser viewing context with the
run's owner. A run ID alone, another browser, an old rotated cookie and an ePA cookie cannot
authorize it. Unknown/foreign/expired/lost runs share a safe 404. Repeated reads preserve
event IDs/timestamps/sequence and trigger no protocol operation. Process restart loses all
state safely. Logout's replacement anonymous context retains eligible safe history only
until the original deadline; retention is never renewed and history grants no resource access.

Existing limits remain 1000 contexts, 1000 runs, 1000 attempts, ten-minute pending lifetime,
fifteen-minute context/run lifetime and 100 events per run. Before outbound work the store
reserves one event for redirect/failure, seven for callback completion and three for a
resource operation. Concurrent operations count reservations. Insufficient budget returns
503 before external contact; no earlier event is evicted or silently truncated. Failure
marks the event document `complete: false` and session `observationsAvailable: false`.
Logout and credential/pending/in-flight cleanup remain independent of a full or throwing
recorder. Tests cover concurrent near-capacity reads, callback refusal before exchange,
recorder failures, stale resource results and callback/logout races.

## Task 7.6 — Disclosure and diagnostic limits

Strict session/resource/event projection and log scans cover fictional passwords, actual
runtime codes/state/nonce/verifiers/tokens/secrets/cookies/CSRF material, raw callback/query
sentinels, identity information, unsupported data and upstream bodies. The session's
context-bound anti-CSRF value is the intentional session-only exception; it is absent from
events, resource responses and logs. Tokens remain server-side; no frontend code is changed.

Routine BFF logs contain only existing closed event/operation names, a request UUID, numeric
status/duration and bounded failure classification. Standard API request IDs are generated
by the server rather than copied from caller input. Neither request path/query nor headers,
bodies, exceptions or identity claim dumps are logged. The legacy ePA request-ID contract is
preserved. The real suite scans both captured BFF logs and the task-owned HAPI container's
stdout/stderr for its actual runtime secrets; the scans pass.

The integration channel is direct private/loopback HTTP, with no authentication callback
passing through the public proxy. Existing fixture-only Traefik routing/configuration is
preserved; this verification introduces no proxy, auth callback access logger or public API
route. It does not claim runtime verification of a future public authentication ingress.

## Actual verification commands and results

Run from `services/auth-client`:

```bash
corepack pnpm typecheck
corepack pnpm test
corepack pnpm exec jest --config test/jest.integration.config.cjs --runInBand test/standard-browser.integration.ts
corepack pnpm test:integration
```

- TypeScript: pass.
- Unit/isolated HTTP: **15 suites, 403 tests pass**.
- Focused real browser/Keycloak/HAPI integration: **5 tests pass**.
- Full real private integration: **3 suites, 20 tests pass**, including standard/ePA exchange,
  required PAR, PKCE/substitution/replay, unchanged provider-enforced code expiry, browser
  lifecycle/logout/SSO, and the new actual HAPI 200/403/401 cases.
- Positive resource case checks the exact minimal view, explicit allowed report, stable
  sequence/provenance, reload, cross-browser/run-ID isolation and retained logout history.
- Permission case requests an `openid`-only grant only in the test's provider navigation;
  the public BFF still selects its fixed scope. Real authentication succeeds and HAPI
  reports insufficient permission. The wrong-token case corrupts only the test's server
  memory and observes an actual HAPI invalid-token denial; no public token override is added.

Run from repository root:

```bash
corepack pnpm build
corepack pnpm lint
corepack pnpm keycloak:test
```

Build and lint pass. All three Keycloak/environment configuration tests pass, including
non-destructive environment initialization in a temporary fixture. No real `env:init`, realm
migration or deployment command was run. Loopback/network and Node child-process tests were
run with the tool's required host permissions; a sandboxed Node-test invocation was retried
successfully with those permissions, without changing application configuration.

## Isolated HAPI startup and cleanup

Only absent task-owned integration names were used. The existing secured image from group 6,
`epa-lab/res-server:verify-001-task6-20261112`, image ID
`sha256:df5b73ca4de42fcdaac3090a2acaa65696a68727372f130e112d1bdaa6e6e5f5`, was selected through
a temporary image-only override. HAPI source/dependencies were not rebuilt or replaced.
The private second env file contained the actual trusted discovery `jwks_uri`. All temporary
configuration, resolved Compose output and test logs were kept outside the repo under
`/tmp/epa-001-observability`, with private permissions. No credentials are in this report.

Actual start command from repository root:

```bash
docker compose --env-file .env --env-file /tmp/epa-001-observability/integration.env -f infrastructure/docker-compose.integration.yml -f /tmp/epa-001-observability/image.compose.yaml --profile integration up --no-build --pull never -d --wait --wait-timeout 240 res-server
```

Both task-owned containers became healthy. Inspected HAPI binding was only
`127.0.0.1:18083:8080`, with dedicated database/loopback networks and Traefik disabled.
PostgreSQL had no port or Docker volume, only its disposable tmpfs database. Status-only
liveness/readiness probes returned 200/`UP`. No public proxy network was joined. The real
BFF listener used an ephemeral `127.0.0.1` port and the configured canonical Host; captured
provider callbacks were delivered only to that test process, never the deployed BFF or SPA.

The four backend/host/integration/playground manifests were validated with `config --quiet`
and resolved privately using `config --format json`. Commands used `.env` plus the same
private second env file. Integration path/network/port/health expectations and disabled
standard deployment configuration were asserted without printing expanded secrets.

Actual task-owned cleanup commands:

```bash
docker compose --env-file .env --env-file /tmp/epa-001-observability/integration.env -f infrastructure/docker-compose.integration.yml -f /tmp/epa-001-observability/image.compose.yaml --profile integration stop --timeout 15 res-server res-server-db
docker compose --env-file .env --env-file /tmp/epa-001-observability/integration.env -f infrastructure/docker-compose.integration.yml -f /tmp/epa-001-observability/image.compose.yaml --profile integration rm --force res-server res-server-db
docker network rm epa-lab-integration_database epa-lab-integration_loopback
```

The [private run guide](../../../infrastructure/README.md) provides reproducible source
build/start/probe/stop commands for subsequent runs. This session reused the previously
verified security image; it did not update the older default integration image tag or any
running deployment.

## Final verification and preservation

All required checks pass. Strict OpenSpec validation and `git diff --check` pass. Local
documentation checks cover 31 documents and 208 local links/anchors, plus 37 shell blocks,
77 package command references and 21 Compose command references; no issues. Compose
service/path/isolation checks and a scan of changed files for configured credentials or
persisted JWTs also pass. The final two added unit cases exercise mixed-case standard routes
so they cannot reflect/log a caller's request ID; the full suite remains green.

The final container comparison matches all **45 original container IDs, images, creation/
start times, states, mounts, network IDs and port bindings**. The volume and network lists
are identical to baseline after removal of only the two task-owned containers/networks.
All **81 protected files** match their hashes, including the fixture UI, ADRs, Keycloak
assets, historical verification/readiness reports, actual `.env` and hosting/Traefik routing.
The HAPI submodule remains clean at the reviewed commit above. Read-only Keycloak comparison
confirms the original realm/client/policy/user/mapping snapshot and standard client/scope
identities still match; temporary fictional identities were removed.

Final validation used these commands from repository root:

```bash
python3 /tmp/epa-001-observability/check-links.py --report /tmp/epa-001-observability/links.json
python3 /tmp/epa-001-observability/check-commands.py
python3 /tmp/epa-001-observability/verify-preservation.py
KEYCLOAK_ADMIN_URL=http://127.0.0.1:5555 node --env-file=.env /tmp/epa-001-observability/verify-keycloak.mjs
OPENSPEC_TELEMETRY=0 npm exec --offline --yes --cache /tmp/epa-001-task24-npm-cache --package @fission-ai/openspec@1.14.1 -- openspec validate 001-oidc-pkce --strict --no-interactive
git diff --check
```

**Remaining blockers:** none for tasks 7.1–7.6. This is backend HTTP integration with real
private Keycloak/HAPI, not React browser acceptance or public deployment. Task 8 and later
remain untouched. No public authentication/routing, existing container or volume was changed;
the public Mission Control remains fixture-only. Historical reports retain their original
scope and results.
