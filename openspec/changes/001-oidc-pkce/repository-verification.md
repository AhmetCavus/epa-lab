# Change 001 — Repository Baseline and Path Repair Verification

**Scope:** Tasks 2.1–2.5 and the explicitly authorized dependency-only prerequisite from task 6.1; local/private work with existing deployments preserved

**Current status — 2026-11-12:** Tasks 2.1–2.4 are complete; overall progress remains 13/50. The owner subsequently authorized the dependency-resolution prerequisite from task 6.1 out of order. The corrected starter resolves at pinned Spring Boot 3.5.14, production Java compilation and the canonical Docker build pass. Task 2.5 resumed, but the packaged HAPI application exits unhealthy on an existing YAML syntax error at `application.yaml:69`. Tasks 2.5 and 6.1 remain unchecked; existing runtime wiring is unchanged. Earlier results below are retained as history. No other later task was started.

**Date / recorder:** 2026-11-11 / Codex

## Task 2.1 — Baseline before source changes

Parent HEAD: `74ad19fb5e3d0e034c983f9276adeadb1c58d3be`. The checkout already contained 16 modified Markdown approval/readiness documents from the preceding step, with no staged changes. Preserve these changes; this is not an initial clean-tree claim. Actual components are `apps/playground`, `services/auth-client`, `infrastructure/keycloak` and canonical HAPI submodule `services/res-server`.

Both HAPI worktrees initially had clean tracked/untracked status and HEAD `253e15666f4a8640b2b13934524fe27f518e9b56` on `feat/enable-oauth`. The canonical clone uses `.git/modules/res-server`; the duplicate at `services/hapi-fhir-jpaserver-secured-starter` has its own `.git` directory. Ordinary branch/remote refs match. The duplicate additionally contains Codex checkpoint tree ref `8890e3da0a8f0f1ce401dacc356ac681d4dae56b`, absent from the canonical clone, plus reflog history and ignored build outputs. Preserve the complete duplicate clone before removing its parent gitlink.

The parent index initially has two mode-160000 entries at that HAPI commit. `.gitmodules` maps only `services/res-server`; canonical targeted status succeeds, but full `git submodule status` fails for the duplicate.

| Check                                                | Baseline result                                                                                                                                                                                                 |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tool versions                                        | Node 24.21.0, npm 11.19.0; pinned pnpm 10.34.6 recovered through Corepack                                                                                                                                       |
| auth-client                                          | NestJS 11.2.7, TypeScript 5.9.3, Jest 30.5.2; package identity `@epa-auth-lab/authorization`                                                                                                                    |
| `npm --prefix services/auth-client run typecheck`    | Passed                                                                                                                                                                                                          |
| `npm --prefix services/auth-client run build`        | Passed                                                                                                                                                                                                          |
| `npm --prefix services/auth-client test -- --silent` | 8 suites / 141 tests passed                                                                                                                                                                                     |
| `npm --prefix apps/playground test`                  | Typecheck/Vite build and all 36 Playwright checks passed, including architecture, localization, browser/accessibility and layout checks                                                                         |
| Initial UI attempt                                   | 7 non-browser checks passed; 29 browser checks could not launch because the browser was missing. Installing the matching browser in a temporary cache recovered the full 36-check run; no UI/test source change |
| pnpm frozen install before repair                    | `install --frozen-lockfile --ignore-scripts` fails with `ERR_PNPM_OUTDATED_LOCKFILE`: stale `services/epa-authorization` importer, actual package `services/auth-client`                                        |
| Root ESLint before repair                            | Stale target `services/epa-authorization` is absent; typed parser project path is stale too                                                                                                                     |
| HAPI tools                                           | Default Java 17; selected installed JDK 21.0.1. Gradle wrapper 8.13; HAPI 8.12.0; Spring Boot 3.5.14                                                                                                            |
| HAPI `gradlew.bat test --no-daemon --console=plain`  | Failed before tests at `:compileJava`: cannot resolve `org.springframework.boot:spring-boot-starter-security-oauth2-resource-server:`. This existing dependency repair belongs to task 6.1, outside this slice  |
| Docker / real Keycloak                               | Docker is not installed, confirmed by the owner. No Compose, image build, container readiness or real-Keycloak integration result is claimed                                                                    |

Initial Corepack/Gradle downloads hit certificate trust errors. Using the existing Windows trust store recovered downloads without disabling certificate checks. Corepack and Playwright caches are temporary; no global package-manager installation changed. Reproducible session settings:

```powershell
$env:COREPACK_HOME = Join-Path $env:TEMP 'epa-lab-corepack'
$env:NODE_OPTIONS = '--use-system-ca'
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $env:TEMP 'epa-lab-playwright'
$taskShims = Join-Path $env:TEMP 'epa-lab-corepack-shims'
New-Item -ItemType Directory -Path $taskShims -Force | Out-Null
corepack.cmd enable --install-directory $taskShims
$env:Path = $taskShims + ';' + $env:Path
# HAPI baseline only:
$env:JAVA_HOME = 'D:/Java/jdk-21'
$env:JAVA_TOOL_OPTIONS = '-Djavax.net.ssl.trustStoreType=Windows-ROOT -Djavax.net.ssl.trustStore=NONE'
```

Use `corepack.cmd pnpm` or the temporary pnpm shim. Nested scripts invoke `pnpm`, so its shim must be on PATH; invoking Corepack alone does not supply that missing PATH entry. These settings are local tool configuration, not application configuration. For pnpm, run `pnpm test` directly; an npm-style extra `-- --silent` is interpreted as a test-path pattern by the nested script and is not the regression command.

### Fixture, style and artwork baseline

Inspected [both reference PNGs and artwork guidance](../../../docs/design/visual-references.md). All 28 generated baseline screenshots were copied to ignored `apps/playground/.cache/001-oidc-pkce-baseline/`. Catalog and loaded OAuth Workspace captures were visually inspected: existing dark hierarchy, JPEG artwork, panels, conceptual annotations and explicit fixture labels are the preservation baseline. No UI source changes are planned.

Baseline production output: `index-hCz0kJ37.css`, `index-BCSvfOA3.js`.

| File                                                          | SHA-256 before changes                                             |
| ------------------------------------------------------------- | ------------------------------------------------------------------ |
| `apps/playground/src/styles.css`                              | `1a3e2f2b5d86108ac728f7cc5eae4b38c146e6401733eaa1acb9566d723ec500` |
| `apps/playground/public/assets/epa-card-header.jpg`           | `493bb00a927e2b23f72158532a798a9f368520bc01d6e8118299ca74cad6d1df` |
| `apps/playground/public/assets/mission-catalog-hero-wide.jpg` | `27630aa607206bda74466556f252f10789da0b7d76f7248ac46f053472ec63d3` |
| `apps/playground/public/assets/mission-catalog-hero.jpg`      | `5215e92396a88ca878e50e3f5de18bf84e3e3053f539bf292fb24fa71b57ca56` |
| `apps/playground/public/assets/oauth-card-header.jpg`         | `c29d8b13765d59c3d1d2a754ddf7fbe8d434bc73b552ddf3082cd584697566b4` |
| `apps/playground/public/assets/openid-card-header.jpg`        | `a6f3cd418f444ed9878faf955041bd28fac2a01d56e521343a1f4cf122242114` |
| `apps/playground/public/assets/saml.jpg`                      | `0f358c58f705fda30a8e59eb38c350bfd708628ef65f31be44c7900b78e33976` |
| `docs/design/assets/catalog-concept.png`                      | `87cad1188a95eef92df0732635951fcf5a690b4b3b3be3f846e2af1e07af951c` |
| `docs/design/assets/workspace-concept.png`                    | `322c696b697668f3a0614f0210d2ea0c773bbbfa493d77ec136065ac0ef20c3b` |

## Task 2.2 — Canonical HAPI submodule

Completed. Moved the entire duplicate clone, including its unique checkpoint tree, reflogs and ignored build outputs, to ignored `.local-backups/001-oidc-pkce/hapi-fhir-jpaserver-secured-starter/`. No history or worktree content was deleted. Its HEAD remains the original HAPI commit and the unique tree is still readable.

Removed only the duplicate parent index gitlink. `.gitmodules` already had the correct single canonical mapping and needed no edit. `git ls-files --stage` now shows one HAPI entry, `git submodule status --recursive` succeeds, and canonical HAPI remains clean at `253e15666f4a8640b2b13934524fe27f518e9b56`.

A fresh temporary parent clone with a verification-only commit containing the gitlink removal successfully initialized recursively from the local canonical HAPI mirror. Both parent and HAPI checkouts are clean, with exactly one initialized submodule at the original commit. This tests the pending index change without committing the user's project changes or requiring remote network access. The verification mirror URL is temporary local Git configuration; the project's `.gitmodules` URL is unchanged.

The duplicate deletion is staged because gitlinks are index entries. Other pre-existing approval edits remain unstaged. `.gitignore` excludes the preserved clone; `.prettierignore` excludes that backup and the independently maintained canonical HAPI repository from root formatting.

## Task 2.3 — Node tooling and lockfile paths

Completed. Root ESLint and its typed project now target `services/auth-client`; the pnpm importer was renamed to that same real path. No dependency version, package identity or application behavior changed.

Pinned pnpm frozen installation passed with resolution skipped (504 packages), using a temporary store. With temporary Corepack shims on PATH, root `pnpm typecheck`, `pnpm build`, `pnpm test` and `pnpm lint` passed. The regression result remains 8 suites / 141 tests. pnpm's default blocked optional dependency build scripts were not enabled; these checks passed without them.

The formatter initially traversed generated OpenSpec/provider files and browser caches and flagged Windows CRLF checkouts. Root ignore rules now exclude generated/copied tool artifacts, caches, preserved clone and independently maintained HAPI/UI packages. `endOfLine: auto` preserves checkout line endings without rewriting backend/UI code. Three existing Markdown differences (ADR-0003 and the two fixture documents) were normalized; formatting-only equivalence against their prior content was verified. ADR-0003 remains Accepted and its decision is unchanged. The UI's own `npm --prefix apps/playground run format:check` also passes; no UI source, stylesheet or artwork was changed.

README documents the real package path, pinned commands, temporary shim alternative and separate UI formatter ownership.

## Task 2.4 — Docker and Compose paths

Path repair is implemented; required Docker verification is blocked. Dockerfile manifest, TypeScript/source, production node_modules, dist and runtime command paths now use `services/auth-client`. The root Compose build reference points to that Dockerfile. Service `epa-authorization`, image `epa-auth-lab/authorization:local`, profile, environment, host networking, healthcheck and Keycloak configuration/volume are preserved.

Static checks with the existing YAML parser passed: Compose differs only at `build.dockerfile`; all declared local build/runtime inputs exist; the Dockerfile differs only by filesystem path replacement. Node image context excludes canonical HAPI and the preserved duplicate clone. These are static checks, not Docker Compose validation or an image-build result.

Docker is not installed, confirmed by the owner. Therefore `docker compose ... config --quiet`, backend image build and container readiness could not run; task 2.4 stays unchecked. README contains exact pending local commands, secret-safe quiet validation and the existing host-network prerequisite. No Keycloak process, volume or public deployment was changed.

## Initial stop boundary — 2026-11-11

Final preservation audit: all nine captured style/artwork/reference hashes are unchanged. Of the 16 pre-existing approval-document edits, only README and this change's tasks file were intentionally extended; the other 14 are byte-identical to the starting snapshot. auth-client source/tests/package identity, Keycloak realm, UI source/assets, static Playground Compose and hosting metadata match the original tracked content. Canonical and preserved HAPI worktrees are clean; the preserved checkpoint tree remains readable.

Strict OpenSpec validation and staged/unstaged `git diff --check` pass. The lockfile comparison confirms only its importer path changed; the YAML comparison confirms only the Compose Dockerfile path changed. All task wording and unchecked states from 2.5 onward are unchanged.

**Progress: 12/50 complete.** Tasks 2.1–2.3 are complete. Task 2.4 remains unchecked pending Docker/Compose/image/readiness verification. Existing HAPI dependency-resolution failure remains for task 6.1. No real-Keycloak test was possible in this environment; 141 auth-client regressions and 36 fixture UI checks passed without changing their application behavior.

Stop after the task 2.4 work and verification report. Tasks 2.5–9 remain unchecked and untouched. No new OAuth feature, HAPI security implementation, Keycloak change, public deployment or Mission Control redesign is included.

## Task 2.4 — Remaining verification on Linux Dev Server, 2026-11-12

**Result: complete.** Compose validation, the repaired auth-client image build, isolated startup/readiness, configured Keycloak connectivity and existing ePA/PAR regressions all passed. This session changed only this record and task tracking; it introduced no application or deployment changes.

### Checkout and tooling

The starting working tree was clean on `main`, tracking `origin/main`, at `b5638e73afa2b7287eb77046052be10dfa71152b`. Canonical `services/res-server` was clean on `feat/enable-oauth` at the unchanged `253e15666f4a8640b2b13934524fe27f518e9b56` pointer. Node was 24.20.0, npm 11.19.0, Docker Engine/client 29.9.2 and Docker Compose 5.6.1.

```bash
git status --short --branch
git branch --show-current
git rev-parse HEAD
git submodule status
git -C services/res-server status --short --branch
docker version --format '{{json .}}'
docker compose version
docker ps -a --format 'table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
docker network ls
docker compose ls --all
ss -ltn
```

Docker socket access was denied inside the execution sandbox; Docker operations succeeded with elevated execution permissions. OpenSpec was absent from PATH. Its pinned CLI was obtained in a temporary cache, without installing it globally or changing repository dependencies:

```bash
npm exec --yes --cache /tmp/epa-001-task24-npm-cache --package @fission-ai/openspec@1.14.1 -- openspec list --json
npm exec --offline --yes --cache /tmp/epa-001-task24-npm-cache --package @fission-ai/openspec@1.14.1 -- openspec status --change 001-oidc-pkce --json
npm exec --offline --yes --cache /tmp/epa-001-task24-npm-cache --package @fission-ai/openspec@1.14.1 -- openspec instructions apply --change 001-oidc-pkce --json
```

The CLI confirmed the nearest repository root, `spec-driven` schema, `ready` apply state and starting progress 12/50. Only task 2.4 was selected for this session.

### Existing services and conflict avoidance

All five existing `epa-lab` containers were running and healthy:

| Container               | Existing binding / network                                      |
| ----------------------- | --------------------------------------------------------------- |
| `epa-lab-playground`    | Internal port 80 on `dev-proxy`; existing public fixture site   |
| `epa-lab-auth-client`   | Host networking; `192.168.178.131:3000`                         |
| `epa-lab-keycloak`      | Host port `0.0.0.0:5555` to container 8080 on `epa-lab_default` |
| `epa-lab-res-server`    | `192.168.178.131:8083` to container 8080 on `epa-lab_default`   |
| `epa-lab-res-server-db` | Internal port 5432 on `epa-lab_default`                         |

The existing Compose project is `epa-lab`. Fixed container names, the occupied auth-client address/port, shared local image tag, and the existing Keycloak data volume make ordinary stack startup unsuitable for this verification. The current checkout's backend service is **`auth-client`**, image **`epa-lab/auth-client:local`**; these existing Dev Server identifiers were preserved. Earlier service/image names in this record describe the preceding checkout, not commands to run here.

Before startup, a credential-free snapshot captured all 45 existing containers' IDs, image IDs, state/start time, health/restart count, ports, mounts, networks and labels. Docker networks and hashes of 18 environment/Compose/hosting/Traefik files were also captured under `/tmp/epa-001-task24/`. No expanded Compose environment or raw Docker environment was printed or saved.

The Dockerfile manifest/source/build/runtime paths and runtime command all use `services/auth-client`; Compose resolves the repository root build context and `services/auth-client/Dockerfile`. Declared build inputs exist; `.dockerignore` excludes `.env`, HAPI and the preservation backup.

A temporary override at `/tmp/epa-001-task24/isolation.compose.yaml` contained:

```yaml
services:
  auth-client:
    image: epa-lab/auth-client:verify-001-task24-20261112
    container_name: epa-001-task24-auth-client
    restart: 'no'
    environment:
      HOST: 127.0.0.1
      PORT: '33024'
    depends_on: !reset {}
    labels:
      traefik.enable: 'false'
```

This retains the service's existing Linux host networking, OIDC configuration and readiness healthcheck. The test uses an independently checked free loopback port and unique project/container/image identifiers. Its resolved configuration has no dependencies, mounts, published ports or proxy-network attachment. No Keycloak, HAPI, database or Playground service is started by these commands. The configured issuer remains `http://192.168.178.131:5555/realms/epa-demo`; the existing client and registered callback settings are unchanged.

### Commands and actual results

All commands below ran from the repository root. Docker/runtime checks used elevated execution permissions where required. Quiet Compose validation passed for the base, host and isolated configurations:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.yml --profile backend config --quiet
docker compose --env-file .env -f infrastructure/docker-compose.host.yml config --quiet
docker compose --project-name epa-001-task24 --env-file .env -f infrastructure/docker-compose.yml -f /tmp/epa-001-task24/isolation.compose.yaml --profile backend config --quiet
docker compose --project-name epa-001-task24 --env-file .env -f infrastructure/docker-compose.yml -f /tmp/epa-001-task24/isolation.compose.yaml --profile backend build auth-client
docker compose --project-name epa-001-task24 --env-file .env -f infrastructure/docker-compose.yml -f /tmp/epa-001-task24/isolation.compose.yaml --profile backend up --no-deps --no-build --pull never -d --wait --wait-timeout 90 auth-client
docker image inspect --format 'ID={{.Id}} User={{.Config.User}} Cmd={{json .Config.Cmd}}' epa-lab/auth-client:verify-001-task24-20261112
docker exec -i epa-001-task24-auth-client node --input-type=module < /tmp/epa-001-task24/runtime-check.mjs
curl --fail --silent --show-error --max-time 10 http://127.0.0.1:33024/health/ready
ss -ltn 'sport = :33024'
```

| Check                                 | Result                                                                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compose validation                    | All three `config --quiet` commands passed without expanding secrets into output                                                                              |
| Existing backend image build          | Passed using BuildKit cache; verification image ID `sha256:1258c35d78a3763d759c4c6d1f8d5b457e5ef36f803c550136dce165bb4ed637`                                  |
| Runtime paths/user                    | `USER node`; command `["node","services/auth-client/dist/main.js"]`                                                                                           |
| Isolated startup                      | Compose reported the new verification container healthy                                                                                                       |
| Compiled container liveness/readiness | HTTP 200; readiness returned `{"status":"up","oidcDiscovery":"available"}`                                                                                    |
| Actual listener                       | `ss` confirmed only `127.0.0.1:33024` for the test port                                                                                                       |
| Connectivity from the container       | Configured Keycloak discovery and JWKS returned 200; issuer matched; PAR, S256 and `client_secret_basic` metadata available                                   |
| Legacy anonymous `/session`           | HTTP 200, unauthenticated, no session cookie issued                                                                                                           |
| Compiled ePA smoke operation          | Real authenticated PAR succeeded; empty 302 response, echoed request ID, no cookie, discovered authorization endpoint with only `client_id` and `request_uri` |

The temporary `runtime-check.mjs` performed these assertions inside the built container. It retained provider metadata and the PAR redirect only in memory and printed fixed pass/fail messages; it did not print redirect references, cookies, credentials, signing keys or response bodies. Readiness proves discovery availability; the separate PAR and integration checks below establish client authentication and legacy login behavior.

Existing regression commands were run with Jest JSON output captured in memory and reduced to counts, static test names and statuses before recording:

```bash
npm --prefix services/auth-client test -- --silent --json
npm --prefix services/auth-client run test:integration -- --silent --json
```

- Auth-client regressions: **8 suites / 141 tests passed**. The first sandboxed attempt passed 88 and failed 53 tests; a separate loopback-bind probe returned `EPERM`. With local socket access through elevated execution, the unchanged suite passed all 141 tests.
- Real configured Keycloak integration: **1 suite / 6 tests passed**. These cover discovery/PAR metadata, a genuine PAR reference opening the login form, rejection of PAR bypass, the legacy browser login/code exchange/ID Token validation and `/session` contract, invented-reference rejection, and required confidential-client credentials.

The integration harness uses a separate in-process Nest application and the existing configured test credentials. It does not send a callback to or replace the running auth-client. No realm/client/policy configuration, redirect registration, HAPI dependency or implementation was altered. Safe result summaries are in `/tmp/epa-001-task24/{unit-summary,unit-elevated-summary,keycloak-integration-summary}.json`.

### Cleanup, preservation and stop boundary

Only the new test container was stopped and removed, after checking its verification project/image identity and absence of mounts:

```bash
docker stop --time 10 epa-001-task24-auth-client
docker rm epa-001-task24-auth-client
ss -ltn 'sport = :33024'
```

Cleanup passed; port 33024 is no longer listening. The separate verification image remains available for inspection. The before/after audit confirmed all **45 original containers** retained their IDs, image IDs, state/start times, health/restart counts, mounts, networks, port bindings and labels. Docker network inventory and all **18 captured environment/Compose/hosting/Traefik file hashes** were unchanged. Keycloak's existing volume creation date remains 2026-10-11; the resource database volume remains dated 2026-10-28. No test volume or network was created, and no existing volume was reset or recreated.

No existing stack was taken down; no existing container was replaced. The public Playground, its fixture-only code/assets and routing, `.env`, repository Compose/Dockerfile files and canonical HAPI worktree were preserved. No public authentication route or listener was added.

OpenSpec apply instructions now report task 2.4 done, task 2.5 pending, and 13/50 complete. Strict change validation passed. The final diff check confirms only this record and task tracking changed; the only checkbox change is task 2.4, and all content from task 2.5 onward is byte-identical to the starting commit. Record validation commands:

```bash
npm exec --offline --yes --cache /tmp/epa-001-task24-npm-cache --package @fission-ai/openspec@1.14.1 -- openspec validate 001-oidc-pkce --strict
node_modules/.bin/prettier --check openspec/changes/001-oidc-pkce/repository-verification.md openspec/changes/001-oidc-pkce/tasks.md
git diff --check
```

**Remaining task 2.4 blockers: none. Progress: 13/50 complete.** Only task 2.4 is newly completed. The earlier HAPI dependency-resolution failure remains historical evidence for task 6.1 and was not investigated or repaired here. Tasks 2.5 and later remain unchecked and unexecuted. Stop at this boundary.

## Task 2.5 — Local/private HAPI integration verification, 2026-11-12

**Result: blocked; checkbox remains open.** The canonical HAPI Docker build fails at `:compileJava` resolving `org.springframework.boot:spring-boot-starter-security-oauth2-resource-server:`. This reproduces the known dependency issue assigned to task 6.1. Following the owner's explicit task 2.5 stop condition, no runtime wiring was changed and no dependency/security repair or later task was attempted.

### Checkout, assets and existing topology

The starting parent working tree was clean on `main`, tracking `origin/main`, at `4a3f6874a262b3dd99da6f728697ec264bd2df27`. Canonical `services/res-server` remained clean at `253e15666f4a8640b2b13934524fe27f518e9b56` on `feat/enable-oauth`. OpenSpec confirmed the nearest repository root, `spec-driven` schema, `ready` apply state and 13/50 progress; task 2.4 is complete and task 2.5 is pending. Previously reviewed product/UX/ADR/proposal/design/spec files were confirmed byte-identical to the task 2.4 review.

Inspected `infrastructure/docker-compose{,.host,.playground}.yml`, `.env` binding settings without printing credentials, `yappai.host.json`, the canonical HAPI `Dockerfile`, `.dockerignore`, `docker-compose.yml`, Gradle declarations/properties, `application.yaml`, `HealthCheck.java`, and the existing Traefik lab route. Actual preflight commands included:

```bash
git status --short --branch
git rev-parse HEAD
git submodule status
git -C services/res-server status --short --branch
docker ps -a --format 'table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
docker network ls
docker volume ls
docker compose ls --all
ss -ltn
```

Filtered `docker inspect`, `docker network inspect` and `docker volume inspect` results established:

| Component                 | Existing local/private configuration                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| auth-client               | `epa-lab-auth-client`, host networking, listener `192.168.178.131:3000`                                                        |
| HAPI                      | `epa-lab-res-server`, `epa-lab_default` address `172.24.0.4`, private host binding `192.168.178.131:8083` to container 8080    |
| PostgreSQL                | `epa-lab-res-server-db`, `res-server-db:5432` on `epa-lab_default`, no published port                                          |
| HAPI database             | `jdbc:postgresql://res-server-db:5432/hapi`, database/user `hapi`, existing configured password retained                       |
| Resource database volume  | `epa-lab_res-server-data`, created 2026-10-28, mounted at `/var/lib/postgresql/data`                                           |
| Keycloak                  | Existing realm issuer `http://192.168.178.131:5555/realms/epa-demo`; retained `epa-auth-lab_keycloak-data`, created 2026-10-11 |
| Public fixture Playground | Existing `dev-proxy` attachment and Traefik route to `http://epa-lab-playground:80`                                            |

HAPI and PostgreSQL have no `dev-proxy` attachment or Traefik labels; the inspected lab route contains only the fixture Playground. The HAPI listener uses a private LAN address. The host-networked auth-client reaches that private binding; no application resource API was added. Internet perimeter reachability was not externally tested.

Port 8083 is already owned by the existing HAPI instance. Starting the submodule's standalone Compose would introduce a different database/container set and publish 8080 on all interfaces; it was not started. Changing the host stack's Compose project name would select a different default `res-server-data` volume. Consequently the separate verification project below was used only to build, never to start services. No database creation, migration, credential change or volume reset was performed.

The existing HAPI Dockerfile builds the canonical fork with Temurin Java 21, Gradle 8.13 and `bootWar`, then packages its distroless Java 21 image and `HealthCheck` class. Pinned project settings remain HAPI 8.12.0 and Spring Boot 3.5.14. Its placeholder `security.oauth2.enable: false` and unrelated local issuer settings are unchanged; they do not establish a working Resource Server security boundary.

### Validation and canonical image-build failure

A temporary `/tmp/epa-001-task25/build.compose.yaml` changed only the build output tag:

```yaml
services:
  res-server:
    image: epa-lab/res-server:verify-001-task25-20261112
```

Actual commands, from the repository root:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.host.yml config --quiet
docker compose --project-name epa-001-task25 --env-file .env -f infrastructure/docker-compose.host.yml -f /tmp/epa-001-task25/build.compose.yaml config --quiet
docker compose --progress plain --project-name epa-001-task25 --env-file .env -f infrastructure/docker-compose.host.yml -f /tmp/epa-001-task25/build.compose.yaml build res-server
```

Both quiet configuration validations passed. A filtered resolved-configuration check confirmed the build context is `/srv/yappai/hosting/epa-lab/services/res-server`, the separate verification image tag, private HAPI publication, internal PostgreSQL port and existing datasource settings.

The Docker build reused the repository's existing assets without modification. Base images, the OpenTelemetry agent and Gradle downloaded successfully; Gradle `help` succeeded. The Dockerfile's next build command, `./gradlew --no-daemon bootWar -Djdk.lang.Process.launchMechanism=vfork`, failed with exit code 1:

```text
> Task :compileJava FAILED
Execution failed for task ':compileJava'.
> Could not resolve all files for configuration ':compileClasspath'.
   > Could not find org.springframework.boot:spring-boot-starter-security-oauth2-resource-server:.
```

The declaration is at `services/res-server/build.gradle.kts:141`. No replacement upstream HAPI image, dependency edit, security toggle or build-check bypass was used. The verification image was not produced. A current canonical image is therefore unavailable for a reproducible task 2.5 startup/health/shutdown verification; the already running image is not evidence that this source revision builds.

### Existing-service health and private connectivity

While the build was pending, a read-only Node probe executed inside `epa-lab-auth-client` fetched these endpoints with a five-second timeout and printed only fixed labels/statuses:

| Probe                                                   | Actual result                                   |
| ------------------------------------------------------- | ----------------------------------------------- |
| Its configured `/health/ready`                          | HTTP 200                                        |
| `http://192.168.178.131:8083/actuator/health`           | HTTP 200 from the existing HAPI service         |
| Configured Keycloak `/.well-known/openid-configuration` | HTTP 200; returned issuer matched configuration |

The following existing health checks also passed with exit code 0:

```bash
docker exec epa-lab-res-server java -cp /app HealthCheck
docker exec epa-lab-res-server-db pg_isready -U hapi -d hapi
docker exec epa-lab-playground wget --quiet --spider http://127.0.0.1/health
```

These verify the current services and network path only. They do not complete canonical build/new integration-profile acceptance, establish protected FHIR access, or verify Resource Server security. No FHIR records were requested, seeded or changed; no real patient data was used.

### Preservation and pending acceptance

Before/after snapshots under `/tmp/epa-001-task25/` confirmed all **45 original containers** retained IDs, image IDs, status/start time, health/restart count, network addresses/aliases, ports, mounts and labels. Docker network and volume inventories were unchanged. All **21 captured environment/Compose/hosting/routing/HAPI configuration file hashes** were unchanged. The parent and HAPI worktrees remained clean before recording these results; HAPI stays clean afterward.

No stack startup/shutdown, container replacement, volume recreation or public routing change occurred. Docker downloaded base images and populated build cache; no runtime cleanup was needed. The existing Keycloak, HAPI/database and fixture-only public Playground remain in place.

Task 2.5 cannot be marked complete: the canonical image build, reproducible integration startup/shutdown and resulting health/connectivity checks remain blocked by the task 6.1 dependency issue. No new integration profile or startup procedure is claimed as verified. Resolving that issue requires a later explicitly scoped request; this session did not start task 6.1, task 2.6 or any other later task.

**Progress remains 13/50. No task was newly completed. Stop after recording this blocker.**

## Task 2.5 resume — Authorized dependency prerequisite from task 6.1, 2026-11-12

**Outcome:** The dependency-resolution/compilation prerequisite is fixed and verified. Task 2.5 remains blocked by an existing runtime YAML syntax error. Task 6.1 remains incomplete; this narrow prerequisite fix does not establish Resource Server security.

### Authorization, baseline and minimal correction

The owner explicitly authorized correcting only the Spring Boot 3.5 OAuth2 Resource Server starter dependency from task 6.1 before resuming task 2.5, with dependency resolution/compilation checks and preservation of all existing Docker containers/volumes. This is an authorized ordering exception; it does not authorize completing the remaining task 6.1 security work or bypassing its acceptance criteria.

Starting parent HEAD was `18737ac6cb6d1b01b7506c73443652f27e073a68` on clean `main`, tracking `origin/main`. Canonical HAPI was clean at `253e15666f4a8640b2b13934524fe27f518e9b56` on `feat/enable-oauth`. OpenSpec confirmed the existing repository root, `spec-driven` schema, `ready` apply state and 13/50 progress. Reviewed product/UX/architecture/proposal/design/spec files remain unchanged.

Only this line in `services/res-server/build.gradle.kts:141` changed:

```diff
-    implementation("org.springframework.boot:spring-boot-starter-security-oauth2-resource-server")
+    implementation("org.springframework.boot:spring-boot-starter-oauth2-resource-server:$springBootVersion")
```

The [Spring Boot 3.5 managed dependency reference](https://docs.spring.io/spring-boot/3.5/appendix/dependency-versions/coordinates.html) confirms the corrected artifact name. The existing `springBootVersion=3.5.14` property is retained explicitly, consistent with the other pinned Boot starters. No HAPI/Java/Gradle version, application configuration, security activation, source implementation or test dependency changed. The HAPI submodule contains this single uncommitted edit; its parent gitlink remains at the original commit. No submodule commit/pointer update or task 6.6 work was performed.

### Canonical build, dependency resolution and compilation

The temporary `/tmp/epa-001-task25-prerequisite/build.compose.yaml` overrides only the build output image tag:

```yaml
services:
  res-server:
    image: epa-lab/res-server:verify-001-task25-prerequisite-20261112
```

Actual commands from the parent repository root, using elevated Docker execution permissions:

```bash
git -C services/res-server diff --check
docker compose --env-file .env -f infrastructure/docker-compose.host.yml config --quiet
docker compose --project-name epa-001-task25-prerequisite --env-file .env -f infrastructure/docker-compose.host.yml -f /tmp/epa-001-task25-prerequisite/build.compose.yaml config --quiet
docker compose --progress plain --project-name epa-001-task25-prerequisite --env-file .env -f infrastructure/docker-compose.host.yml -f /tmp/epa-001-task25-prerequisite/build.compose.yaml build res-server
docker build --progress=plain --target build-hapi --tag epa-lab/res-server-build:verify-001-task25-prerequisite-20261112 --file services/res-server/Dockerfile services/res-server
docker run --rm --name epa-001-task25-gradle-check --network none --label traefik.enable=false --memory 4g --cpus 2 epa-lab/res-server-build:verify-001-task25-prerequisite-20261112 ./gradlew --offline --no-daemon --console=plain dependencyInsight --configuration compileClasspath --dependency org.springframework.boot:spring-boot-starter-oauth2-resource-server compileJava
```

| Check                                | Actual result                                                                                                                                                                                  |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base/verification Compose validation | Both quiet checks passed                                                                                                                                                                       |
| Canonical Docker build               | Passed using the existing Dockerfile and corrected canonical fork; no upstream HAPI replacement                                                                                                |
| Production compilation/package       | `:compileJava`, `:processResources`, `:classes`, `:prepareWebapp`, `:resolveMainClassName` and `:bootWar` completed; Gradle reported `BUILD SUCCESSFUL in 57s`, five actionable tasks executed |
| Existing compiler warning            | Deprecated `JacksonMcpJsonMapper` warning; no compile error, and no unrelated repair attempted                                                                                                 |
| Runtime image construction           | Existing distroless packaging and `HealthCheck` compilation passed; runtime image ID `sha256:16557a35a28c0ffe87ac3fcc3e08eb717404fcd966854b2f4f297a58e710ebc5`                                 |
| Offline dependency check             | `org.springframework.boot:spring-boot-starter-oauth2-resource-server:3.5.14 (selected by rule)` on `compileClasspath`; no unresolved starter                                                   |
| Explicit follow-up compile task      | `:compileJava UP-TO-DATE`; offline verification `BUILD SUCCESSFUL in 7s`, following the actual production compilation above                                                                    |

The verification build stage uses the Dockerfile's Java 21/Gradle 8.13 toolchain. The offline check ran with no network, ports or mounts and removed its temporary container afterward. No full HAPI test suite was claimed; this prerequisite verification covers dependency resolution, production compilation and image packaging.

### Resumed task 2.5 — Isolated startup exposes a new blocker

A host YAML parser check first rejected the unchanged `services/res-server/src/main/resources/application.yaml`, reporting `expected <block end>, but found '<block mapping start>'` at line 69, column 3, with mapping context at line 4, column 1. The `security` section's indentation and the following `ai` mapping were not altered in this dependency-only correction.

After the dependency checks passed, the packaged application was tested without access to existing databases, host services or public networks. The temporary `/tmp/epa-001-task25-prerequisite/check-startup.py` invoked:

```bash
docker run --detach --name epa-001-task25-prerequisite-hapi --network none --restart no --label traefik.enable=false --memory 3g --cpus 2 --health-cmd 'java -cp /app HealthCheck' --health-interval 5s --health-timeout 5s --health-start-period 10s --health-retries 2 epa-lab/res-server:verify-001-task25-prerequisite-20261112
```

The helper waited for exit, inspected state and filtered logs in memory, then removed only its own test container. No full logs or generated credentials were printed or saved. The recorded result in `/tmp/epa-001-task25-prerequisite/startup-summary.json` is:

| Field                   | Actual result                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Image/runtime           | Corrected canonical image above; non-root user `65532:65532`                                                             |
| Container status / exit | `exited`, exit code **1**                                                                                                |
| Docker health           | **unhealthy**                                                                                                            |
| Startup diagnostic      | YAML parser error: expected block end, found block mapping start; context line 4/column 1 and error line **69/column 3** |
| Isolation               | `network_mode: none`, zero published ports, zero mounts, Traefik disabled                                                |

This confirms a runtime configuration blocker in the built artifact. Healthy integration startup and connectivity to the corrected HAPI process could not be established. The YAML/property-binding repair is beyond the authorized dependency-only prerequisite, so it was left unchanged and implementation stopped. No security auto-configuration exclusion, permit-all policy, placeholder-toggle change, issuer substitution or alternate configuration was used to make startup pass. Task 6.1 still requires property binding, security activation, focused security-test support, documented issuer/audience configuration and its complete acceptance evidence.

### Existing-service checks, preservation and final scope

After removing the verification container, probes inside the existing `epa-lab-auth-client` returned HTTP 200 for its own configured readiness endpoint, the existing private HAPI `/actuator/health` at `192.168.178.131:8083`, and configured Keycloak discovery with matching issuer. These existing health commands also passed:

```bash
docker exec epa-lab-res-server java -cp /app HealthCheck
docker exec epa-lab-res-server-db pg_isready -U hapi -d hapi
docker exec epa-lab-playground wget --quiet --spider http://127.0.0.1/health
```

Those results describe the preserved running services, not the failing corrected image. Before/after audits under `/tmp/epa-001-task25-prerequisite/` confirmed all **45 original containers** retain IDs, image IDs, state/start times, health/restart counts, mounts, network addresses/aliases, port bindings and labels. Network and volume inventories and all **20 captured environment/Compose/hosting/routing/HAPI configuration file hashes** are unchanged. Both temporary verification containers were removed; the separately tagged runtime/build-stage images remain for inspection.

No original container or volume was stopped, replaced, reset or recreated. The public fixture-only Playground, routing, Keycloak, existing HAPI/database and `.env` remain unchanged. No FHIR record was requested/seeded/changed and no real patient data was used. Only the one-line nested dependency edit, this record and task-status prose changed.

**Progress remains 13/50. Tasks 2.5 and 6.1 remain unchecked.** Reproducible private integration startup/health/connectivity/shutdown acceptance is still blocked by the confirmed YAML error; no new integration profile or verified startup procedure is claimed. Stop here without implementing other task 6.1 obligations, task 2.6 or unrelated OAuth functionality.
