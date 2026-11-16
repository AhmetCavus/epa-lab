# Task 9.4 — Approved production dependency remediation

**Date:** 2026-11-13. **Scope:** task 9.4 only, under the
[consolidated owner approval](proposal.md#task-94-security-remediation). Task 9.5,
availability promotion and public deployment/routing changes are excluded.

## Approval and baseline

The owner explicitly approved the limited three-dependency extension and invoked apply.
The decision was recorded in the existing proposal, design and task scope note **before
implementation**. An approval-only diff and hash comparison confirmed that package/config/
lockfile and application files were still unchanged at that point. Approval is authorization,
not verification evidence.

The checkout started on `main`, tracking `origin/main`, at
`a14647e0bc12c04de70d8dd915006f6872934707`, with the three planning files already staged.
Their staged content is preserved; working-tree approval updates remain reviewable.
OpenSpec selected the existing repository root, `spec-driven`, ready, **48/50** complete.
All 45 original containers, network/volume inventories and port bindings were recorded,
alongside 262 protected-file hashes. The HAPI commit remains
`e65bafc279f02f44b19b47ca7326015886047a63`.

## Exact resolution and compatibility

| Approved transitive dependency | Before | Installed / frozen Docker image | Advisory                                                                 |
| ------------------------------ | ------ | ------------------------------- | ------------------------------------------------------------------------ |
| `body-parser`                  | 2.3.0  | **2.4.0**                       | [GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828) |
| `multer`                       | 2.4.0  | **2.5.0**                       | [GHSA-q7qp-rjg7-q26m](https://github.com/advisories/GHSA-q7qp-rjg7-q26m) |
| `qs`                           | 6.16.0 | **6.16.1**                      | [GHSA-6pq8-jhm2-2vcw](https://github.com/advisories/GHSA-6pq8-jhm2-2vcw) |

The implementation changes only `pnpm-workspace.yaml` and `pnpm-lock.yaml`: exact overrides
for the three approved names, with corresponding locked resolutions. NestJS **11.2.7**,
Express **5.2.1**, all direct dependency pins and all other package versions/integrities
remain unchanged. **No supporting dependency version change was necessary.** Existing
children already satisfy the patched packages' declared dependencies and Node 24 meets their
engine requirements. Registry integrity values match the three new lockfile records.

NestJS's platform package pins Multer exactly to 2.4.0, so its override supplies the fixed
2.5.0 without a framework upgrade. Express's `body-parser: ^2.2.1` / `qs: ^6.14.0` and
Superagent's `qs: ^6.14.1` admit the fixed versions. The same approved QS update also replaces
the development test client's QS copy; Superagent itself stays **10.4.1**. Installed checks
confirm Express and body-parser both actually resolve QS 6.16.1. These are reachable graph
changes, not unused direct dependencies added beside vulnerable nested copies.

A disposable `pnpm update` candidate left two requested transitives unchanged and attempted
an unrelated `react-is` alias update. It was discarded without changing the real lockfile.
The adopted candidate uses a normal lockfile-only install with exactly the three overrides.
Semantic comparison proves unchanged importers, settings and all unrelated package records;
the only existing consumer-edge changes are NestJS → Multer, Express → body-parser/QS and
Superagent → QS. Newly keyed target snapshots retain the same other dependency versions.

No application implementation, test behavior, security policy, frontend resource or Docker
manifest was changed. Existing accepted requirements and task IDs remain intact.

## Audit result and remaining findings

The patched **production audit is clean: zero vulnerabilities**. All three target advisories
are absent from both production and full audit output. Frozen installation succeeds with
the reviewed graph; no audit setting, ignore list or security exception is introduced.

The full audit still reports **four moderate and one low** findings in unchanged development
tooling: `glob` 10.5.0/13.0.6, `minimatch` 9.0.9/10.2.6 and `deepmerge` 4.3.1. Their versions
and integrities are unchanged and they are outside this approved remediation. They remain
documented findings, without a claim that the full development audit is clean or that they
are waived. See the [prior finding inventory](integrated-acceptance-verification.md#security-dependency-result-and-acceptance-blocker)
for advisory references and the original dated result.

## Packaged runtime and HAPI verification

The existing auth-client Dockerfile builds a separate
`epa-lab/auth-client:verify-001-task94-20261113` image. Its production and build stages both
use frozen installation and receive the workspace overrides through the existing COPY paths.
A disposable network-disabled/read-only container confirms the actual three fixed runtime
versions, including both QS consumers. No deployed image tag/container is replaced.

The patched image also starts in a task-owned container on unused **127.0.0.1:31084**.
Liveness returns **200** and readiness returns **200** after actual private Keycloak
discovery. The socket is loopback-only; Traefik is disabled. The temporary environment is
server-side, mode 0600 and not baked into the image. This container is stopped/removed after
the probe; the original auth-client and port 3000 remain untouched.

HAPI validation uses a clean archive of the unchanged reviewed commit in the existing Java
21 build-stage image. The task-owned Gradle container has two CPUs, 5 GiB RAM, no additional
swap and one test fork (1 GiB Gradle heap / 1536 MiB test heap), with no published port or
existing Docker volume. Scoped Spotless, compilation and WAR packaging pass. All **122
focused tests** and **62 real servlet/JPA integration cases** pass with no failures/errors/
skips; all 14 selected tasks execute with task/build caches disabled. Build takes 1m 36s.
The unrelated upstream HAPI functional/Testcontainers suite is not claimed to pass under
the intentionally narrow mission policy.

## Current acceptance results

| Check                                                       | Result                                                                           |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Frozen backend install, typecheck and build                 | Pass                                                                             |
| Existing NestJS unit/HTTP suite                             | **403 pass**                                                                     |
| Production / complete audit                                 | **0 production**; four moderate / one low development findings remain            |
| Docker build, actual dependency graph and startup/readiness | Pass; fixed versions; live/ready **200**                                         |
| HAPI focused / real servlet integration / WAR               | **122 + 62 pass**, no skips; package built                                       |
| Real NestJS/Keycloak/HAPI and ePA/PAR regressions           | **44 pass**, three suites                                                        |
| Direct real Keycloak/HAPI security                          | **107 assertions pass**; three real exchanges, standard PAR **0**, ePA PAR **1** |
| Fresh recursive local browser journey                       | Pass; login, reload, authorized read, logout and owned history                   |
| Public fixture-only browser check                           | Pass on unchanged retry; initial language-selection failure recorded below       |
| SPA/browser/accessibility/localization/native zoom          | **91 pass**, no skips; both locales and native 100%/200% zoom                    |
| Lint/format, strict OpenSpec, links/commands and disclosure | Pass; documentation and disclosure counts below                                  |
| Final provider/container/network/volume/file preservation   | Configuration/data preserved; deployed HAPI lifecycle exception below            |

The [existing requirement-to-test matrix](integrated-acceptance-verification.md#task-92--requirement-to-test-matrix)
remains the mapping for unchanged application behavior. This record supplies fresh results
against the patched graph. Required real checks use the existing Keycloak and canonical HAPI,
not mocked substitutes. Heavy Java/browser checks run serially to avoid the resource pressure
documented in the earlier acceptance run.

The fresh browser performs one normal top-level login, returns to the fixed Workspace and
restores the same run on reload without repeating protocol operations. Its single synthetic
read returns **200**, with the explicit HAPI report `allowed/demo-read-allowed`. There are
9 login / 12 post-read observations. After local logout, a BFF-local resource request returns
**401** without another HAPI request, and 14 owned safe observations remain inspectable.
The BFF observer and HAPI reporter remain distinct. Browser storage contains only the
explicit locale. Actual-value browser/BFF/HAPI log checks and provider preservation pass.
Sanitized JSON and four clean Workspace screenshots are retained in the
[new private browser evidence directory](../../../apps/playground/.cache/task94-remediation/real/).
The reused verifier retains its original task-8 scope label; this dated execution is the
task-9.4 regression result. No provider password screenshot, HAR, trace or video is saved.

| Accepted requirement                                                                                      | Fresh evidence against the patched graph                                                                   |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Standard Code + S256 without PAR; independent ePA/PAR and legacy sessions                                 | Real browser, 44 NestJS integration tests and 107 direct HAPI/provider assertions                          |
| State/cookie/correlation, replay, concurrent completion, expiry and profile substitution                  | Real-code negative integration cases; existing signed-token validation tests                               |
| Token signature/algorithm/claims, HAPI 401/403, synthetic-read-only policy and independent health         | 122 focused HAPI tests, 62 real servlet/JPA cases, direct real HAPI checks and loopback live/ready **200** |
| Browser-owned runs, event ordering/provenance and truthful BFF versus HAPI decisions                      | Real browser/integration checks plus existing event producer/consumer and UI tests                         |
| CSRF, pending/in-flight logout cancellation, exhausted event storage and cleanup despite recorder failure | Real-session negative tests within the 44 integration cases and existing 403 unit/HTTP cases               |
| Secret-free APIs/events/logs and no raw callback capture                                                  | Real actual-value in-memory checks, focused response/event tests and final artifact scan                   |
| Fixture/conceptual ePA, bilingual accessibility and native zoom                                           | Full SPA suite and actual read-only public fixture check                                                   |

The actual public HTTPS check verifies German default, English selection, fixture-only
OAuth samples and conceptual-only ePA, with **zero forbidden requests and zero browser
errors**. Any authentication/API/external request is aborted before transmission. Its first
run failed at language selection; inspection confirmed the existing combobox's accessible
name was already correct. The unchanged verifier passed on retry. The initial failure's
cause was not established and is not hidden by a test, UI or deployment change. Both
outcome logs are retained privately; the successful sanitized JSON and three screenshots
are in the [new public fixture evidence directory](../../../apps/playground/.cache/task94-remediation/public/).

Both disposable integration containers were healthy. HAPI publishes only
**127.0.0.1:18083**, and its liveness/readiness endpoints independently return **200**.
PostgreSQL has no published port or Docker volume and uses only disposable tmpfs. Both
services use only the dedicated integration networks; the database network is internal.
The pair is stopped after the real tests, before the full browser suite.

Fresh local recursive reproduction uses the existing local HAPI repository as the clone's
submodule source; only the two reviewed dependency files and a mode-0600 temporary environment
are overlaid. The remote HAPI commit availability limitation remains unchanged and explicitly
unverified; this scope does not publish commits, modify remotes in the original repositories
or change the submodule pointer.

## Preservation and explicit deployment finding

Provider verification confirms the original realm, clients, scopes, policies, users and
mappings are preserved, and all disposable identities are removed. All **45** original
container IDs, images, creation times, mounts, network memberships and port bindings match
the baseline. Network and volume inventories also match. Only task-owned containers and
empty integration networks were removed; no existing stack was brought down or volume reset.

The lifecycle comparison has one explicit exception: **44** original containers retain
their recorded lifecycle state/start time; the existing `epa-lab-res-server` cycles under
its unchanged `unless-stopped` restart policy. Docker records exit **1** and automatic
restart. Its current `FHIR_OIDC_JWKS_URI` is empty, and Spring rejects the trust configuration
with `Resource Server issuer, JWKS and playground-fhir audience must be configured safely`.
The current state does not report an OOM kill. No command in this task restarts or changes
that deployed container. The retained bounded logs do not establish the first failure time,
so this record does not claim an observed before/after health history for that deployment.
This is an unresolved deployment configuration finding, separate from the successful
explicitly configured isolated HAPI acceptance runtime. It is not repaired or presented as
a healthy deployed service under this three-dependency scope. Existing deployments still
use their prior images; the patched verification image has not been rolled out.

Of **262** protected files, **257** remain byte-identical. The only five changed baseline
files are the three approval/task planning documents and the two reviewed dependency files;
this dated report is new. All application/test source, frontend manifests/lockfile, styles,
artwork, accepted ADRs/specifications, historical reports, root `.env`, hosting manifest and
external Traefik configuration remain unchanged. The original staged diff is byte-identical,
the parent HEAD is unchanged, and HAPI retains its clean reviewed commit.

Root lint/format, frontend format, strict OpenSpec and all four Compose configurations pass.
Documentation validation covers **38 documents / 256 local links**, **58 shell blocks**,
**107 package-command references** and **32 Compose-command references**, with no issues.
The disclosure scan passes for **73 source/distribution files** and **55 diagnostic/result
files**, with no configured secrets, persisted JWTs or raw callback queries. Real suites
also check actual temporary sensitive values in memory, including APIs/events/logs.

## Actual commands

Private logs, registry manifests, audits and preservation digests are stored under
`/tmp/epa-001-task94-remediation/` with restricted access. No credential values are included here.
The temporary auth-client/fresh-checkout environments and resolved Compose configuration
copies are removed after verification; the original root `.env` remains unchanged.

From repository root:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
corepack pnpm audit --prod --json
corepack pnpm audit --json
docker build --tag epa-lab/auth-client:verify-001-task94-20261113 --file services/auth-client/Dockerfile .
docker run --name epa-001-task94-gradle --cpus 2 --memory 5g --memory-swap 5g --network bridge --mount type=bind,src=/tmp/epa-001-task94-remediation,dst=/verification --workdir /verification/hapi-validation epa-lab/res-server-build:verify-001-task9-20261113 sh ./gradlew --no-daemon --no-build-cache --rerun-tasks --max-workers=2 --console=plain -Dorg.gradle.jvmargs=-Xmx1024m -I /verification/gradle.init.gradle spotlessCheck test --tests '*security.*Test' --tests '*demo.*Test' --tests 'HealthCheckTest*' integrationTest --tests '*PlaygroundResourceSecurityIT' bootWar
corepack pnpm test:integration
node --env-file=.env services/res-server/scripts/verify-private-security.mjs
```

The existing isolated HAPI profile reuses the verified fork image through a private image-only
override and trusted discovery's JWKS URI in the second environment file. Its PostgreSQL
database uses disposable tmpfs only. No original service or volume is recreated.

```bash
docker compose --env-file .env --env-file /tmp/epa-001-task94-remediation/integration.env -f infrastructure/docker-compose.integration.yml -f /tmp/epa-001-task94-remediation/image.compose.yaml --profile integration config --quiet
docker compose --env-file .env --env-file /tmp/epa-001-task94-remediation/integration.env -f infrastructure/docker-compose.integration.yml -f /tmp/epa-001-task94-remediation/image.compose.yaml --profile integration up --no-build --pull never -d --wait --wait-timeout 240 res-server
docker compose --env-file .env --env-file /tmp/epa-001-task94-remediation/integration.env -f infrastructure/docker-compose.integration.yml -f /tmp/epa-001-task94-remediation/image.compose.yaml --profile integration stop res-server res-server-db
docker compose --env-file .env --env-file /tmp/epa-001-task94-remediation/integration.env -f infrastructure/docker-compose.integration.yml -f /tmp/epa-001-task94-remediation/image.compose.yaml --profile integration rm --force res-server res-server-db
docker rm epa-001-task94-gradle
docker network rm epa-lab-integration_database
docker network rm epa-lab-integration_loopback
```

The patched auth-client runtime probe uses the new image and a separate loopback listener:

```bash
docker run --detach --rm --name epa-001-task94-authclient-check --network host --env-file /tmp/epa-001-task94-remediation/auth-client.env --label traefik.enable=false epa-lab/auth-client:verify-001-task94-20261113
docker stop epa-001-task94-authclient-check
```

Fresh local recursive setup uses the existing source repositories. The clone alone receives
the local submodule URL, the two reviewed dependency files and the restricted environment:

```bash
git clone --local --no-hardlinks /srv/yappai/hosting/epa-lab /tmp/epa-001-task94-remediation/fresh
git -C /tmp/epa-001-task94-remediation/fresh config submodule.res-server.url /srv/yappai/hosting/epa-lab/services/res-server
git -C /tmp/epa-001-task94-remediation/fresh -c protocol.file.allow=always submodule update --init --recursive
```

From the fresh clone's root, frozen backend installation and build pass. From its
`apps/playground`, frontend installation and the real browser check run as follows:

```bash
npm ci --cache /tmp/epa-001-spa/npm-cache
PLAYGROUND_VERIFY_PRIVATE=true npm run test:private
```

From the original `apps/playground`, the read-only public check (including its unchanged
retry), complete SPA suite and formatting check are:

```bash
PLAYGROUND_VERIFY_PUBLIC_FIXTURES=true node tests/verify-public-fixtures.mjs
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 PLAYGROUND_NATIVE_CHROMIUM=/tmp/epa-001-spa/browsers/chromium-1194/chrome-linux/chrome npm test -- --workers=1
npm run format:check
```

Final checks from the original repository root:

```bash
npm --prefix apps/playground audit --json --cache /tmp/epa-001-spa/npm-cache
corepack pnpm lint
KEYCLOAK_ADMIN_URL=http://127.0.0.1:5555 node --env-file=.env /tmp/epa-001-task94-remediation/verify-keycloak.mjs
python3 /tmp/epa-001-task94-remediation/check-links.py --report /tmp/epa-001-task94-remediation/links.json
python3 /tmp/epa-001-task94-remediation/check-commands.py
node /tmp/epa-001-task94-remediation/verify-disclosure.mjs
python3 /tmp/epa-001-task94-remediation/verify-preservation.py
OPENSPEC_TELEMETRY=0 npm exec --offline --yes --cache /tmp/epa-001-task24-npm-cache --package @fission-ai/openspec@1.14.1 -- openspec validate 001-oidc-pkce --strict
git diff --check
```

## Completion boundary

Task **9.4 is complete** after the checks above. Fresh apply instructions confirm **49/50**
complete, with only task **9.5** pending; no other task checkbox or description changes.
Task 9.5 is unchanged and unstarted. This remediation updates the checkout and a verification image;
it does not roll out changes to existing deployments or enable public authentication.
Historical verification reports and their original failures/limitations are preserved.
