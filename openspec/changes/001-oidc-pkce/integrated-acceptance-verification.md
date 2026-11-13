# Tasks 9.1–9.4 — Integrated private acceptance

**Date:** 2026-11-13. **Requested scope:** tasks 9.1–9.4 only. Task 9.5 remains unchecked;
there is no runnable-availability promotion or public authentication deployment.

## Baseline and permitted changes

The checkout began clean on `main`, tracking `origin/main`, at
`7e606197416f43f5ad44504a769de06fab564655`. OpenSpec selected the existing repository root,
`spec-driven`, ready, **45/50** tasks complete. All 45 existing containers, networks,
volumes and port bindings were recorded, together with hashes of 260 tracked/protected
files. HAPI remains at reviewed commit `e65bafc279f02f44b19b47ca7326015886047a63`.

The only application dependency change is backend Zod **4.6.5 → 4.6.6** in
`services/auth-client/package.json` and `pnpm-lock.yaml`. No other dependency version or
resolution was changed. Existing application implementation, frontend UI, policies, artwork,
Docker manifests and public routing remain unchanged. Verification extends the existing
real NestJS integration suite and refreshes private test-admin authentication before
temporary-user teardown. These are test-harness changes, not new application authentication.

## Security dependency result and acceptance blocker

The installed backend Zod was 4.6.5. The authoritative
[Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) identifies versions below
4.6.6 as affected by excessive validation-memory consumption. The smallest compatible
patch, 4.6.6, is installed and locked. Frozen installation, typecheck/build, 403 unit/HTTP
tests and all 44 real private integration tests pass after that patch. The advisory is
absent from the post-patch audit. Frontend Zod was already 4.6.6.

The broader audit found additional existing dependencies. No unrelated upgrades or
workarounds were applied under the user's Zod-only remediation authorization.

| Production finding                                          | Installed | Advisory / patched version                                                       | Acceptance status            |
| ----------------------------------------------------------- | --------- | -------------------------------------------------------------------------------- | ---------------------------- |
| `body-parser`, through `@nestjs/platform-express → express` | 2.3.0     | [GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828), 2.4.0  | High; unresolved, blocks 9.4 |
| `multer`, through `@nestjs/platform-express`                | 2.4.0     | [GHSA-q7qp-rjg7-q26m](https://github.com/advisories/GHSA-q7qp-rjg7-q26m), 2.5.0  | High; unresolved, blocks 9.4 |
| `qs`, through `@nestjs/platform-express → express`          | 6.16.0    | [GHSA-6pq8-jhm2-2vcw](https://github.com/advisories/GHSA-6pq8-jhm2-2vcw), 6.16.1 | Moderate; unresolved         |

The production audit reports **two high and one moderate** findings. Including development
dependencies, the audit reports **two high, five moderate and one low**, involving the above
packages plus `glob` (10.5.0/13.0.6), `minimatch` (9.0.9/10.2.6), and `deepmerge` (4.3.1).
Development paths include Jest/coverage tooling, Supertest and ESLint. Additional advisory
references are [glob](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4),
[minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249), and
[deepmerge](https://github.com/advisories/GHSA-gcqx-w48m-w2h4). Full audit JSON stays
in the private task directory; it is not replaced with a claim of a clean backend audit.
The frontend audit reports **zero vulnerabilities**.

Installed vulnerable dependencies are a finding, not proof of exploitation. This exercise
does not perform a denial-of-service exploit against any existing service. Resolving the
remaining dependencies requires a separately authorized dependency change; **task 9.4
remains unchecked**. Existing deployed images were deliberately not updated under the
container-preservation constraint.

## Task 9.1 — Real browser acceptance

A fresh local parent checkout and recursive HAPI checkout were prepared under
`/tmp/epa-001-acceptance/fresh`. Only the exact Zod package/lockfile patch, private untracked
mode-0600 environment and test teardown correction were supplied. Frozen backend/frontend
installations and the existing backend build completed there.

The first normal remote submodule fetch could not obtain the locally maintained HAPI
commit. The disposable checkout's submodule remote was explicitly set to the trusted local
canonical repository, then recursive checkout resolved the exact reviewed commit. This
verifies local reproducibility; it does **not** prove that an ordinary remote recursive
clone can fetch that commit. Remote availability remains a release prerequisite, without
pushing or changing any existing repository remote in this task.

The existing native-proxy browser verifier ran from that fresh checkout against the real
private Keycloak realm and isolated secured HAPI. The browser's unchanged canonical
application origin, cookie behavior, native Origin and normal redirects are preserved;
no callback interception, policy relaxation or browser-security bypass is used.

| Required behavior                       | Actual result                                                                            |
| --------------------------------------- | ---------------------------------------------------------------------------------------- |
| Start authentication in Mission Control | One normal top-level navigation to the existing BFF login route                          |
| Real provider and code/S256 exchange    | Actual Keycloak form/callback; standard PAR calls **0**                                  |
| Return                                  | Clean fixed Workspace after callback                                                     |
| Refresh                                 | Same owned run and event IDs; no repeated login or resource action                       |
| Protected read                          | One HAPI synthetic read, **200**, explicit `allowed/demo-read-allowed` report            |
| Event provenance                        | 9 login / 12 post-read events, BFF observer and separate HAPI reporter                   |
| Local logout                            | Subsequent BFF resource request **401**, no second HAPI call                             |
| Safe history                            | 14 owned observations remain inspectable after the local rejection                       |
| Disclosure / preservation               | Browser storage only explicit locale; BFF/browser/HAPI log scan and provider digest pass |

The reused verifier's JSON retains its original focused-task scope label; the current dated
execution above is task-9 acceptance evidence. Sanitized JSON and four clean-Workspace
screenshots are retained under
[`apps/playground/.cache/integrated-acceptance/real/`](../../../apps/playground/.cache/integrated-acceptance/real/).
No trace/HAR/video, provider password screenshot, raw callback or token response is saved.

## Task 9.2 — Requirement-to-test matrix

`standard-browser.integration.ts` now includes actual provider-code negatives, real concurrent
completion, exact-Origin/CSRF checks, browser isolation, context loss and cleanup with a full
trace or throwing recorder. Gates pause **call-through** real exchange or cryptographic
validation; they do not fabricate successful provider responses. Signature/nonce fault
injection is explicit. BFF lifetime tests advance only the process-local clock; the separate
provider-code expiry test actually waits for configured Keycloak expiry without changing
realm lifetimes. A fresh Nest instance verifies lost process-local context.

The capacity test obtains exactly 100 actual BFF observations: one rejected callback, nine
login observations and 30 real HAPI reads with three observations each. The next read is
rejected before upstream work. Logout removes credentials and cancels a pending real code
despite the full trace, retaining the original bounded history as incomplete. No filler
events are labeled as actual observations.

The matrix below distinguishes real integration, signed-token/real-server cryptographic
tests and controlled UI projection tests. A successful journey is not used as evidence
that every negative case passed.

| Requirement / scenario                                                                      | Test evidence                                                                                                                       |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Direct standard code/S256, fresh attempts, no PAR                                           | Real SPA verifier; `profiles.integration.ts`; `standard-browser.integration.ts`                                                     |
| Standard metadata without PAR; ePA requires PAR                                             | `oidc-discovery.service.spec.ts`; real Keycloak discovery/PAR tests                                                                 |
| Missing/wrong/duplicate cookies, unknown/missing/duplicate state, wrong host                | Real-code parameterized rejection tests; legitimate code still completes afterward                                                  |
| Code plus error, untrusted issuer, caller-selected profile                                  | Real-code rejection tests; standard HTTP shape/override tests                                                                       |
| Standard/ePA route, code and client substitution                                            | Real-code ePA-route rejection; both actual cross-client exchanges in `profiles.integration.ts`; profile binding unit tests          |
| Replay and concurrent callbacks                                                             | Real code, one exchange only; replay rejects without replacing authentication                                                       |
| Provider denial                                                                             | Actual Keycloak `prompt=none` rejection without SSO; safe `provider-denied` return, no exchange                                     |
| PKCE mismatch, reused code, expired code                                                    | Actual Keycloak negative exchanges for both profiles; provider expiry is waited out                                                 |
| ID Token signature and nonce failure                                                        | Fault-injected actual signed Keycloak token/context, real validator, no session                                                     |
| Each signing-key/algorithm/issuer/audience/azp/nonce/lifetime/hash/token-response failure   | `profile-token.service.spec.ts`, real cryptographic checks using individually signed test JWTs and trusted test JWKS; both profiles |
| Minimal/no-store session; cookie scope, HTTPS flags, legacy isolation                       | Real browser/integration sessions; standard/browser HTTP tests                                                                      |
| Expired pending/session/history and restart recovery                                        | Real-provider setup with BFF clock advance; fresh process-local Nest instance; browser recovery tests                               |
| Fixed synthetic resource; no arbitrary URL or caller credentials                            | Real SPA/HAPI read; `standard-resource.spec.ts`; standard HTTP rejection tests                                                      |
| Direct HAPI 200/401/403; narrower permission; ID/ePA substitution                           | Real Keycloak/HAPI 107-assertion script; real BFF HAPI allowed/denied/corrupted-token integration                                   |
| Signed invalid HAPI JWTs, alternate paths/methods/interfaces, health                        | Real servlet/JPA `PlaygroundResourceSecurityIT` and focused security/health tests; direct packaged HAPI probes                      |
| Exact-Origin, CSRF, foreign context, GET logout                                             | Real authenticated two-browser negative tests; old-cookie/old-CSRF real regression; standard HTTP matrix                            |
| Pending callback cancellation on logout                                                     | Real code held pending during logout; no later exchange/commit                                                                      |
| Logout while exchange or validation is in flight                                            | Call-through actual provider exchange/validation gates; no authenticated cookie or restored session                                 |
| Full event storage / throwing recorder cleanup                                              | Real-session 100-observation test and throwing recorder; unchanged credential removal/cancellation; no extra HAPI call              |
| 1000-entry collections; 100-event reservation and no truncation                             | `standard-browser-state.spec.ts` and HTTP capacity tests; actual-observation capacity integration                                   |
| Cross-browser/run-ID-only/invalidated cookie event isolation                                | Real two-browser histories and CSRF, real old-cookie rejection, owned-event HTTP tests                                              |
| Stable IDs/order/time and browser-owned logout history                                      | Real SPA and BFF integration; event contract and UI projection tests                                                                |
| Observer vs reporter; missing/invalid report unavailable; no BFF-to-HAPI denial fabrication | Actual allowed/401/403 reports; `resource-report.spec.ts`; adapter/runtime tests                                                    |
| Unknown/unsafe schema and strict per-kind evidence                                          | Producer/consumer contract tests for all 21 kinds and unsafe fields                                                                 |
| No protocol replay on restore/checkpoints/language/replay/reset                             | Real browser reload; controlled UI action/selection tests                                                                           |
| Fixture/observed/conceptual separation; provider internals unobservable                     | Generic renderer architecture and runtime/fixture browser tests                                                                     |
| German/English, keyboard/focus/reduced motion, Inspector/diagram access                     | Existing browser/localization/axe/native-zoom suite                                                                                 |
| Tokens/codes/verifiers/state/nonce/secrets/cookies/claims/bodies absent                     | Actual-value in-memory scans in real browser/Nest/HAPI verifiers; focused projection/logging tests and final artifact scan          |
| Runnable availability                                                                       | **Not executed: task 9.5**, catalog retains honest preview/planned status                                                           |

Primary matrix sources: [BFF integration](../../../services/auth-client/test/standard-browser.integration.ts),
[profile/token cryptography](../../../services/auth-client/src/oidc/profile-token.service.spec.ts),
[real HAPI servlet/JPA integration](../../../services/res-server/src/test/java/ca/uhn/fhir/jpa/starter/security/PlaygroundResourceSecurityIT.java),
[SPA browser suites](../../../apps/playground/tests/), and the
[public fixture verifier](../../../apps/playground/tests/verify-public-fixtures.mjs).

Result: **44 real private NestJS integration tests pass** (29 standard lifecycle/negative,
nine profile and six legacy Keycloak/ePA cases). The direct real Keycloak/HAPI verifier
passes **107 assertions**. Gradle additionally passes **122 focused tests** and **62 real
servlet/JPA integration cases**, with no failures, errors or skips. All **91 SPA tests pass**.

## Task 9.3 — Regression checks

The existing ePA header/PAR request, confidential-client requirement, require-PAR policy,
browser `/login` → `/callback` → legacy `/session` contract and independent profile behavior
pass in the real integration suite. No existing client, realm, session implementation or
ePA policy is changed. All 91 SPA tests pass, including conceptual ePA, fixture routing,
selection, architecture, localization, accessibility and actual native 100%/200% zoom in
both languages. The single-worker final run takes two minutes and has no skipped cases.

The opt-in read-only `tests/verify-public-fixtures.mjs` also passes against the actual public
HTTPS site. German default, English selection, Fixture preview/Planned catalog, explicitly
loaded OAuth samples and conceptual-only ePA are verified. It sees **zero auth/API attempts
and zero browser errors**. Its browser aborts any unexpected API/authentication request
before transmission. It offers no authentication and performs no public backend operation.
Sanitized JSON and three screenshots are retained under
[`apps/playground/.cache/integrated-acceptance/public/`](../../../apps/playground/.cache/integrated-acceptance/public/).
An initial smoke-test selector incorrectly expected a language button; inspecting the
existing select control and correcting the test resolved that check without a site change.

## Task 9.4 — Combined quality checks

| Check                                                         | Current result                                              |
| ------------------------------------------------------------- | ----------------------------------------------------------- |
| Frozen backend/frontend installations in fresh local checkout | Pass                                                        |
| Backend typecheck/build/unit/HTTP                             | Pass; 403 tests                                             |
| Real backend integration                                      | Pass; 44 tests                                              |
| Direct real Keycloak/HAPI                                     | Pass; 107 assertions                                        |
| Fresh local real browser acceptance                           | Pass                                                        |
| Focused Gradle security/integration/WAR checks                | Pass; 122 tests / 62 integration cases, no skips; WAR built |
| React browser/accessibility/localization/native zoom          | Pass; 91 tests, no skips                                    |
| Public fixture browser verification                           | Pass; no auth/API attempted                                 |
| Formatting/lint/strict OpenSpec/documentation/disclosure      | Pass; final checks below                                    |
| Frontend dependency audit                                     | Pass; zero vulnerabilities                                  |
| Backend production security audit                             | **Blocked**; two high / one moderate remaining findings     |

Failures are retained honestly. An initial temporary override used the wrong JWKS variable;
HAPI correctly failed closed. Correcting the test-only key to the existing documented
`RES_SERVER_JWKS_URI` started HAPI successfully without a policy/source change. During concurrent
Gradle/browser runs, severe host memory/swap pressure was observed: the first SPA attempt had
79 passes and 12 timeouts, and the Gradle attempt was interrupted. The slow browser attempt
outlived its initial admin token; teardown failed with 401 before writing its outcome file,
so that attempt's original browser failure stage is unavailable. Its temporary identity was
removed with fresh authentication and the provider preservation digest was restored. Test teardown now refreshes its admin
authentication. The final acceptance browser and remaining heavy checks pass serially.

The final Gradle run uses a clean `git archive` of the unchanged HAPI commit in a task-owned
Java 21 container: two CPUs, 5 GiB memory, no additional swap and one test fork. The Gradle
heap is 1 GiB and the test heap 1536 MiB. No existing Docker volume is mounted and no port
is published. The temporary init script retains the previously approved focused Spotless
targets; it changes no source or security policy. All 14 selected build tasks execute with
task/build caches disabled; build succeeds in 1m 28s. Seven focused unit suites and the real
servlet/JPA integration suite have zero failures/errors/skips. The full unrelated upstream
HAPI functional/Testcontainers suite is not claimed to pass under the narrow exercise policy.

## Actual commands and isolated environment

Private logs, resolved configuration and audit JSON are mode-restricted under
`/tmp/epa-001-acceptance/`. No environment/token values are included here.

```bash
corepack pnpm --filter @epa-auth-lab/authorization add --save-exact zod@4.6.6
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
corepack pnpm test:integration
corepack pnpm audit --json
corepack pnpm audit --prod --json
npm --prefix apps/playground audit --json --cache /tmp/epa-001-spa/npm-cache
node --env-file=.env services/res-server/scripts/verify-private-security.mjs
```

The first command runs in the fresh checkout's `apps/playground`; the remaining commands
run in the canonical `apps/playground`:

```bash
PLAYGROUND_VERIFY_PRIVATE=true npm run test:private
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 PLAYGROUND_NATIVE_CHROMIUM=/tmp/epa-001-spa/browsers/chromium-1194/chrome-linux/chrome npm test -- --workers=1
PLAYGROUND_VERIFY_PUBLIC_FIXTURES=true node tests/verify-public-fixtures.mjs
```

Canonical HAPI build-stage and final Gradle commands from repository root:

```bash
docker build --target build-hapi --tag epa-lab/res-server-build:verify-001-task9-20261113 services/res-server
docker run --name epa-001-task9-gradle --cpus 2 --memory 5g --memory-swap 5g --network bridge --mount type=bind,src=/tmp/epa-001-acceptance,dst=/verification --workdir /verification/hapi-validation epa-lab/res-server-build:verify-001-task9-20261113 sh ./gradlew --no-daemon --no-build-cache --rerun-tasks --max-workers=2 --console=plain -Dorg.gradle.jvmargs=-Xmx1024m -I /verification/gradle.init.gradle spotlessCheck test --tests '*security.*Test' --tests '*demo.*Test' --tests 'HealthCheckTest*' integrationTest --tests '*PlaygroundResourceSecurityIT' bootWar
```

Local recursive source reproduction also passed independently from a clean checkout:

```bash
git clone --local --no-hardlinks /srv/yappai/hosting/epa-lab /tmp/epa-001-acceptance/recursive-local-check
git -C /tmp/epa-001-acceptance/recursive-local-check config submodule.res-server.url /srv/yappai/hosting/epa-lab/services/res-server
git -C /tmp/epa-001-acceptance/recursive-local-check -c protocol.file.allow=always submodule update --init --recursive
```

The existing integration Compose profile uses its reviewed HAPI image through an image-only
temporary override, and a private environment file containing trusted discovery's JWKS URI.
It creates only `epa-lab-integration-res-server` / `epa-lab-integration-res-server-db`, with
dedicated database/loopback networks and Traefik disabled. Both were healthy; HAPI publishes
only `127.0.0.1:18083`, while PostgreSQL has no published port or Docker volume, using only
its disposable tmpfs. The original services were not rebuilt/replaced. Task-owned Java
services were stopped before serial browser/Gradle checks to avoid further resource contention.

```bash
docker compose --env-file .env --env-file /tmp/epa-001-acceptance/integration.env -f infrastructure/docker-compose.integration.yml -f /tmp/epa-001-acceptance/image.compose.yaml --profile integration config --quiet
docker compose --env-file .env --env-file /tmp/epa-001-acceptance/integration.env -f infrastructure/docker-compose.integration.yml -f /tmp/epa-001-acceptance/image.compose.yaml --profile integration up --no-build --pull never -d --wait --wait-timeout 240 res-server
docker compose --env-file .env --env-file /tmp/epa-001-acceptance/integration.env -f infrastructure/docker-compose.integration.yml -f /tmp/epa-001-acceptance/image.compose.yaml --profile integration stop --timeout 15 res-server res-server-db
```

## Final preservation and tracking

Tasks **9.1–9.3 are complete (48/50)**. Each checkbox was checked against fresh CLI
source-path/line output and confirmed through a refreshed apply result. Task **9.4 remains
unchecked**, blocked by the production dependency findings; task **9.5 is untouched**.
No availability or public routing change is made.

Final comparisons pass: **45 original containers** retain their original IDs, images,
creation/start times, states, mounts, networks and port bindings. Network/volume inventories
match the initial snapshot; no Docker volume was removed. All **255 unaffected protected
files** match their initial hashes. The five changed baseline files are exactly the backend
package/lockfile, two existing test harnesses and task tracking; two new files supply this
record and the public fixture check. The parent branch/HEAD, HAPI commit/working tree,
existing Keycloak clients/scopes/policies/users/mappings, `.env`, hosting/Traefik files,
frontend implementation/artwork/styles, ADRs and historical evidence are unchanged.
All temporary identities, task-owned containers/networks and listener/browser processes are
cleaned up. Real provider/session checks do not imply byte-identical database contents or
provider-wide SSO logout.

Root lint, frontend formatting, Node syntax, `git diff --check`, four Compose configurations
and strict OpenSpec validation pass. Documentation validation covers **33 documents / 235 local links** with no broken target,
plus **51 shell blocks, 97 package-script references and 28 Compose-command references**. Disclosure
scans cover **74 source/distribution files** and **40 diagnostic/result files**, finding no
configured secrets, persisted JWTs or raw callback queries. Actual runtime token/code/verifier/
state/nonce/cookie/CSRF/identity values are additionally checked in memory by the real suites.
Temporary environment-bearing configuration is not published as evidence and is removed
after validation.

Additional actual final commands:

```bash
corepack pnpm lint
git diff --check
python3 /tmp/epa-001-acceptance/check-links.py --report /tmp/epa-001-acceptance/links.json
python3 /tmp/epa-001-acceptance/check-commands.py
python3 /tmp/epa-001-acceptance/verify-preservation.py
KEYCLOAK_ADMIN_URL=http://127.0.0.1:5555 node --env-file=.env /tmp/epa-001-acceptance/verify-keycloak.mjs
node /tmp/epa-001-acceptance/verify-disclosure.mjs
OPENSPEC_TELEMETRY=0 npm exec --offline --yes --cache /tmp/epa-001-task24-npm-cache --package @fission-ai/openspec@1.14.1 -- openspec validate 001-oidc-pkce --strict
docker compose --env-file .env --env-file /tmp/epa-001-acceptance/integration.env -f infrastructure/docker-compose.integration.yml -f /tmp/epa-001-acceptance/image.compose.yaml --profile integration rm --force res-server res-server-db
docker rm epa-001-task9-build epa-001-task9-gradle
docker network rm epa-lab-integration_database epa-lab-integration_loopback
```

From canonical `apps/playground`:

```bash
npm run format:check
node --check tests/verify-public-fixtures.mjs
node --check tests/verify-private-runtime.mjs
```

There is no remaining functional-test failure in the selected acceptance scope. Final
security acceptance is **blocked by the additional dependency findings**, with no silent
waiver or unrelated upgrade. Remote distribution of the local HAPI commit is also not
verified. Stop after task 9.4; task 9.5 is not started.
