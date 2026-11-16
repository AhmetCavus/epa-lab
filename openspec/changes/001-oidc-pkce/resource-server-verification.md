# Tasks 6.1–6.6 — Private HAPI Resource Server boundary

**Date:** 2026-11-12. **Scope:** the canonical HAPI fork, its private integration wiring and
verification. **Result: tasks 6.1–6.6 pass; 33/50 complete.** Stop after task 6.6.
No task 7 work was started.

## Baseline and preservation boundary

The parent checkout began clean on `main`, tracking `origin/main`, at
`6bf6c6ee6e6e6e79376caece960cfcc77aaec9c0`. OpenSpec reported the existing repository root,
`spec-driven`, `ready`, and **27/50** complete. The canonical submodule was clean on
`feat/enable-oauth`, at `d609c23ae82cbd4f9cd5da26e09306b24029d131`.

The existing dependency and health prerequisites are retained. The starting application
chain authenticated every other request, without the mission's audience/purpose/permission
or operation restrictions; its issuer/JWKS were unrelated placeholders. This session
implements those missing requirements in the same server. The [HAPI policy](../../../services/res-server/SECURITY.md)
documents configuration, fixture setup, supported tokens, exact operation, reporting and tests.

No auth-client application/configuration, Playground, Keycloak client/realm policy, production
route, database volume or existing running container was changed. Parent HAPI Compose inputs
now carry the trusted issuer/JWKS/private-HTTP opt-in; only the separate integration profile
enables the synthetic seed. `.env` is unchanged. These source changes are not deployed.

## Task 6.1 — Foundation and fail-closed configuration

- Retains `spring-boot-starter-oauth2-resource-server` on pinned Spring Boot **3.5.14**,
  HAPI **8.12.0**, Java **21**, Gradle **8.13**; no production dependency/version replacement.
  Adds only the managed `spring-security-test` test dependency. The resolved security line
  is **6.5.10**. Build/test verification uses existing Temurin **21.0.13** build assets.
- Binds immutable `spring.security.oauth2.resourceserver.jwt` trust properties. Both issuer
  and JWKS are mandatory; audience configuration must be exactly `[playground-fhir]`.
  The placeholder enable flag is removed and cannot disable security.
- Requires safe same-origin URLs without credentials/query/fragment/traversal. HTTPS and
  loopback HTTP are supported; RFC1918 IPv4 HTTP needs an explicit private-development opt-in.
  JWKS redirects are disabled and connect/read timeouts are five seconds. Incoming tokens
  cannot choose keys, issuer or JWKS. Startup validates configuration without a network fetch.
- Focused context-startup tests verify valid binding, missing/invalid settings, wrong audience,
  cross-origin JWKS, unsafe URLs and private-HTTP opt-in. Data requests fail closed; there is
  no permit-all fallback or unrelated issuer substitution.

Source YAML parses, dependency resolution, production/test compilation and executable WAR
packaging pass. The original wrapper lacks an execute bit, so actual container commands use
`sh ./gradlew` without changing tracked file modes.

## Task 6.2 — Real JWT validation

The production Nimbus decoder permits RS256 and trusted JWKS keys only, exact issuer and
`playground-fhir` audience. `exp` is required, `nbf` is checked when present, and timestamp
tolerance is zero. Signed Keycloak payload `typ` must be `Bearer`; a present `scope` must be
a string. Normal ID Tokens, including an ID-purpose test token with the resource audience,
are rejected. An unsuitable ePA token cannot substitute for a resource Access Token.

Tests sign actual RSA JWTs and use a loopback JWKS server, the real decoder and filter chain.
Negative cases cover malformed/unsigned/HMAC/other-algorithm tokens, forged or unknown keys,
wrong/missing audience, wrong issuer, expired/future/missing expiry, ID/missing purpose and
invalid scope type. The full-server suite repeats the matrix through actual embedded Tomcat
and the HAPI servlet/database. The health-only mock decoder is not the JWT-validation evidence.

## Task 6.3 — Reproducible non-clinical Basic

`demo/playground_demo.json` is a fictional R4 Basic with logical ID `playground-demo`, a code
under `example.invalid`, and no subject, author, patient or clinical content. Explicit local
`PLAYGROUND_DEMO_SEED=true` initializes it through HAPI's DAO; default/shared-host seeding is
off. There is no anonymous write/seed route. Existing matching content is left unchanged,
and conflicting content fails without an update. Tests cover absent/identical/conflicting
records and the actual served resource's strict field allowlist.

Real PostgreSQL verification restarts only the task-created HAPI container while leaving its
task-created tmpfs database running. The synthetic resource remains **version 1** before and
after restart, and the complete real-provider check passes both times. Existing databases
are never mounted or seeded.

## Tasks 6.4–6.5 — Exact authorization and safe reports

The existing application chain is now stateless and bearer-only. CSRF, form login, HTTP Basic,
saved requests and application logout are disabled in that chain because no cookie/session
credential is accepted. No data operation is permitted anonymously. Only literal
`GET /fhir/Basic/playground-demo` with no query string and `SCOPE_demo.fhir.read` is authorized.

Valid tokens on other resources, searches, writes, history/vread, operations, metadata,
GraphQL, SMART discovery, tester/Swagger, MCP/SSE, CDS and other Actuator paths are denied.
Actual batch and transaction Bundle bodies cannot tunnel an allowed read through POST.
Noncanonical paths are rejected with 400/403, including encoded/slashed/semicolon variants.

The unchanged separate health chain permits only exact GET/HEAD liveness/readiness, returns
status only and never enters JWT validation, even with malformed bearer headers. All ordinary
missing/invalid credential cases return **401**; valid-but-insufficient/undeclared operations
return **403**. Denial bodies are empty, with a fixed `Bearer` 401 challenge.

The Resource Server emits only these fixed decision/reason values:

| Result                                           | Decision  | Reason                    |
| ------------------------------------------------ | --------- | ------------------------- |
| Authorized demo read returning 200               | `allowed` | `demo-read-allowed`       |
| Missing bearer credentials, 401                  | `denied`  | `missing-token`           |
| Invalid credentials, 401                         | `denied`  | `invalid-token`           |
| Missing permission on the exact read, 403        | `denied`  | `insufficient-permission` |
| Undeclared operation with valid credentials, 403 | `denied`  | `operation-not-allowed`   |

The allowed header writer checks the actual authorized operation and 200 result. Health
does not acquire resource-decision headers. Firewall failures use the fixed operation-denial
reason; low-level servlet-container 400s can have no security report. Their checked responses
contain no raw exception/stack information. Status alone is not relabelled as an observed
internal check list or time. No BFF event projection/API is implemented.

HAPI access messages are constant and exception logging is off; configured request-header,
parameter, URL/body and user-agent log templates are no longer used. Routine security/web
debug logging is disabled. Embedded and packaged checks scan tokens, identity-claim sentinels,
credentials, codes, verifiers, cookies and request content without printing their values.
The real-provider verifier reads both isolated container stdout and stderr.

## Commands and actual results

Private artifacts are under `/tmp/epa-001-hapi-security/`. Detailed Gradle/Docker logs are
redirected to mode-0600 local files; repository evidence contains counts and safe outcomes.
The installed host Java is 25, so builds use the existing Java 21 HAPI build-stage image in
the task-owned `epa-001-task6-build` container. It publishes no ports, mounts no existing
Docker volume, and is limited to two CPUs/5 GiB. Its only binds are this HAPI checkout and
the task's temporary verification directory. The canonical runtime image uses a separate
verification tag, preserving deployed image/container identities.

Actual build/test commands (from the parent root):

```bash
docker exec epa-001-task6-build sh ./gradlew --no-daemon --max-workers=2 --console=plain -Dorg.gradle.jvmargs=-Xmx1536m dependencyInsight --configuration compileClasspath --dependency spring-boot-starter-oauth2-resource-server compileJava compileTestJava
docker exec epa-001-task6-build sh ./gradlew --no-daemon --max-workers=2 --console=plain -Dorg.gradle.jvmargs=-Xmx1536m -I /verification/format.init.gradle spotlessApply test --tests '*security.*Test' --tests '*demo.*Test' --tests 'HealthCheckTest*'
docker exec epa-001-task6-build sh ./gradlew --no-daemon --max-workers=2 --console=plain -Dorg.gradle.jvmargs=-Xmx1536m -I /verification/format.init.gradle spotlessApply integrationTest --tests '*PlaygroundResourceSecurityIT' bootWar
docker build --tag epa-lab/res-server:verify-001-task6-20261112 services/res-server
node --check services/res-server/scripts/verify-private-security.mjs
corepack pnpm exec prettier --ignore-path /dev/null --check services/res-server/SECURITY.md services/res-server/scripts/verify-private-security.mjs
git -C services/res-server diff --check
```

The formatting init script limits the existing Spotless formatter to changed production
security/fixture/configuration code and focused tests. No unrelated Java tree is reformatted.
The final integration run additionally verifies explicit batch/transaction and alternate
discovery/search/GraphQL/history paths. Tests are selected by scope; the entire upstream
HAPI functional/Testcontainers suite is not claimed to pass under this intentionally narrow
mission policy.

| Check                                                 | Actual result                                                                                                                    |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Dependency resolution and production/test compilation | Pass; corrected starter and pinned versions retained                                                                             |
| Focused Gradle unit/security/health/fixture tests     | **122 pass**, seven suites, no failures/errors/skips                                                                             |
| Embedded real HAPI security integration               | **62 pass**, no failures/errors/skips                                                                                            |
| WAR and canonical Dockerfile build                    | Pass; separate `epa-lab/res-server:verify-001-task6-20261112` image                                                              |
| Real existing Keycloak → isolated HAPI                | **107 assertions pass per final cycle**, three actual code exchanges: two direct standard grants and one ePA PAR grant           |
| Real resource decisions                               | Standard+permission 200; missing/invalid/ID/ePA tokens 401; narrower grant 403; undeclared operations 403                        |
| Private connectivity and health                       | Internal Docker probes 200; internal anonymous read 401; existing host-networked auth-client reaches isolated readiness with 200 |
| Restart/idempotent seed                               | Both HAPI/PG healthy; synthetic version 1 retained across HAPI restart                                                           |
| Sensitive log scan                                    | Pass for embedded tests and packaged stdout/stderr; no credential/claim/body values printed                                      |

### Isolated startup, restart and shutdown

The trusted `jwks_uri` is read from the existing private issuer's discovery document into
mode-0600 `integration.env` as `RES_SERVER_JWKS_URI`. An image-only temporary override selects
the verification tag. Both project container/network names were absent and loopback port
18083 was free before startup. No `.env`, realm, callback or running stack was changed.

```bash
docker compose --env-file .env --env-file /tmp/epa-001-hapi-security/integration.env -f infrastructure/docker-compose.integration.yml -f /tmp/epa-001-hapi-security/image.compose.yaml --profile integration config --quiet
docker compose --env-file .env --env-file /tmp/epa-001-hapi-security/integration.env -f infrastructure/docker-compose.integration.yml -f /tmp/epa-001-hapi-security/image.compose.yaml --profile integration up --no-build --pull never -d --wait --wait-timeout 240 res-server
node --env-file=.env services/res-server/scripts/verify-private-security.mjs
docker compose --env-file .env --env-file /tmp/epa-001-hapi-security/integration.env -f infrastructure/docker-compose.integration.yml -f /tmp/epa-001-hapi-security/image.compose.yaml --profile integration stop --timeout 15 res-server
docker compose --env-file .env --env-file /tmp/epa-001-hapi-security/integration.env -f infrastructure/docker-compose.integration.yml -f /tmp/epa-001-hapi-security/image.compose.yaml --profile integration up --no-build --pull never -d --wait --wait-timeout 240 res-server
node --env-file=.env services/res-server/scripts/verify-private-security.mjs
docker compose --env-file .env --env-file /tmp/epa-001-hapi-security/integration.env -f infrastructure/docker-compose.integration.yml -f /tmp/epa-001-hapi-security/image.compose.yaml --profile integration stop --timeout 15 res-server res-server-db
docker compose --env-file .env --env-file /tmp/epa-001-hapi-security/integration.env -f infrastructure/docker-compose.integration.yml -f /tmp/epa-001-hapi-security/image.compose.yaml --profile integration rm --force res-server res-server-db
docker network rm epa-lab-integration_database epa-lab-integration_loopback
```

Only `127.0.0.1:18083:8080` is published. PostgreSQL has no port or existing volume mount,
uses tmpfs and the internal database network; HAPI's dedicated bridge permits loopback
publication and private JWKS access. Neither service joins `dev-proxy`, and Traefik discovery
is disabled. Cleanup ownership is checked against the original 45-container snapshot before
stopping/removing task-created containers. No `compose down`, reset or volume deletion runs.

The real-provider script creates/deletes a fully fictional identity and intercepts callbacks
in memory, never calling the deployed BFF/SPA. Its assertions keep real tokens server-side.
It verifies standard no-PAR behavior and an ePA exchange through PAR without changing policy.
The seed/live read contains no patient data. These checks do not implement a BFF resource
route, UI integration or the complete learning event API.

## Task 6.6 — Review, commit, pin and fresh checkout

**Source review:** Codex, 2026-11-12, against the accepted task 6 policy. The review checks
actual production decoder/filter wiring, no token-selected trust, exact raw GET/no-query
matching, deny-all fallback, health-chain isolation, test-only trust defaults, DAO-only
optional seeding, report/status agreement and constant routine access logging. The pinned
HAPI dispatch bytecode was also inspected: request type comes from the servlet method;
there is no alternative method-override path around the allowed GET. No independent external
review is claimed.

The reviewed source is recorded as local HAPI commit
**`e65bafc279f02f44b19b47ca7326015886047a63`** (`Implement private Playground FHIR resource security`),
on the existing `feat/enable-oauth` branch. Its tree is clean. The prior commit is
`d609c23ae82cbd4f9cd5da26e09306b24029d131`. Production starter/version pins are retained;
changes are the focused security/fixture implementation, tests, safe logging and documentation.

The parent integration commit **`596ac9605610f83011b0b7ddc23cb745bceeb218`** pins that exact
reviewed commit. A fresh independent parent checkout under the temporary verification
directory recursively initializes the same HAPI commit with clean trees and no prior build
outputs. Local repositories supply the Git objects for these new local commits; the source
repositories' remotes and tracked `.gitmodules` are unchanged. No push or deployment was
performed, and remote publication is not claimed.

Actual fresh-checkout commands:

```bash
git clone --no-local --no-checkout /srv/yappai/hosting/epa-lab /tmp/epa-001-hapi-security/fresh
git -C /tmp/epa-001-hapi-security/fresh checkout --detach 596ac9605610f83011b0b7ddc23cb745bceeb218
git -C /tmp/epa-001-hapi-security/fresh config submodule.res-server.url file:///srv/yappai/hosting/epa-lab/services/res-server
git -C /tmp/epa-001-hapi-security/fresh -c protocol.file.allow=always submodule update --init --recursive
docker exec --workdir /verification/fresh/services/res-server epa-001-task6-build sh ./gradlew --offline --no-daemon --no-build-cache --rerun-tasks --max-workers=2 --console=plain -Dorg.gradle.jvmargs=-Xmx1536m -I /verification/format.init.gradle spotlessCheck test --tests '*security.*Test' --tests '*demo.*Test' --tests 'HealthCheckTest*' integrationTest --tests '*PlaygroundResourceSecurityIT' bootWar
```

**Result:** `BUILD SUCCESSFUL in 1m 3s`; all **122 focused tests** and **62 full-server
integration cases** execute and pass, with zero failures/errors/skips. Scoped Spotless,
fresh compilation and WAR packaging pass. Dependency downloads are offline and task/build
cache results are disabled for this final run. Both Git trees remain clean. An earlier
fresh run reused Gradle task results; the final forced run above is the execution evidence.

The final parent completion record changes only documentation/task tracking, retaining the
same HAPI pin and implementation. A local source rollback uses a reviewed revert of the
integration commit above, restoring the earlier gitlink/configuration without touching data
volumes or the existing deployment. Do not treat the earlier health-only revision as the
new mission authorization policy.

## Final preservation and repository validation

After runtime and fresh-checkout verification, the task-owned build container is removed.
Read-only snapshot comparisons then confirm all **45 original containers** retain IDs,
images, creation/start times, mounts, network IDs and port bindings. The exact volume and
network inventories match. All **127 protected file hashes** match, including auth-client,
fixture UI/assets, ADRs, historical verification/readiness reports, `.env`, host manifest
and public Traefik routing. HAPI is clean at the reviewed commit. No configured credential
value appears in changed/new source or documentation.

Keycloak's pre/post digest matches existing realm/client secrets, policies/profiles, users
and role/group mappings. Standard client/scope IDs, definitions, secret and assignments
are unchanged; temporary HAPI verifier identities are removed. Only the task-owned
containers/networks are stopped/removed; no volume operation or original-stack shutdown runs.

```bash
KEYCLOAK_ADMIN_URL=http://127.0.0.1:5555 node --env-file=.env /tmp/epa-001-hapi-security/verify-keycloak.mjs
python3 /tmp/epa-001-hapi-security/verify-preservation.py
python3 /tmp/epa-001-hapi-security/check-links.py --report /tmp/epa-001-hapi-security/links-final.json
python3 /tmp/epa-001-hapi-security/check-commands.py
corepack pnpm lint
git diff --check
OPENSPEC_TELEMETRY=0 npm exec --offline --yes --cache /tmp/epa-001-task24-npm-cache --package @fission-ai/openspec@1.14.1 -- openspec validate 001-oidc-pkce --strict
OPENSPEC_TELEMETRY=0 npm exec --offline --yes --cache /tmp/epa-001-task24-npm-cache --package @fission-ai/openspec@1.14.1 -- openspec instructions apply --change 001-oidc-pkce --json
```

All checks pass. The adapted temporary documentation validators include this evidence and
the HAPI policy/README: **196 local links across 30 documents**, **31 shell blocks**,
**70 package-command references** and **18 Compose references** pass. Resolved backend/host/Playground/integration Compose configurations
are refreshed into mode-0600 files without printing expanded settings. Existing tests/source
and public routing are preserved. OpenSpec locations are refreshed and each checkbox checked
individually only after acceptance; progress advances 27 → 28 → 29 → 30 → 31 → 32 → **33/50**.
Task 7 onward is byte-identical to the starting task document.

## Remaining scope

No blocker remains within tasks 6.1–6.6. Tasks 7 onward remain unchanged and unstarted. Existing historical reports remain intact.
The current deployed containers are intentionally not updated; new HAPI builds require
the documented trusted JWKS setting. Public Mission Control remains fixture-only.
