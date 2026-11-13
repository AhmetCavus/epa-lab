# Auth Protocol Playground

> **Project state:** `001-oidc-pkce` has tasks **1–9.4 verified, 49/50 complete**. The persistent private deployment was rolled back after connectivity failed. The owner's scoped firewall correction now restores bridge TCP/HTTP access to the BFF and configured JWKS, but **task 9.5 remains unchecked pending persistent-runtime acceptance**. The private frontend is removed and the standard mission disabled; reviewed patched backends and corrected JWKS are retained. The Git blocker is resolved. Default builds and the public [`apps/playground`](apps/playground/README.md) remain fixture-only. See the [owner approval](openspec/changes/001-oidc-pkce/readiness-review.md#consolidated-owner-approval-summary), [integrated acceptance](openspec/changes/001-oidc-pkce/integrated-acceptance-verification.md), [dependency remediation](openspec/changes/001-oidc-pkce/dependency-remediation-verification.md), [approved private deployment plan](openspec/changes/001-oidc-pkce/private-deployment-plan.md), [deployment/rollback evidence](openspec/changes/001-oidc-pkce/private-deployment-verification.md) and [firewall evaluation](openspec/changes/001-oidc-pkce/firewall-verification.md).

Run the UI from this repository root with `npm --prefix apps/playground ci` and `npm --prefix apps/playground run dev`, then open <http://127.0.0.1:5173/missions>. The `playground:*` root scripts manage the hosted UI; existing backend commands retain their behavior. See the [UI package guide](apps/playground/README.md) for build, deployment and browser checks.

**Explore protocols. Execute flows. Understand security.**

A browser-only learning playground with a **Mission Catalog** and reusable **Mission Control Workspace**. Each mission explains a protocol through its actors, actions, safe observations, and contextual explanations. The first intended runnable mission is **OAuth 2.0 / OIDC Authorization Code + PKCE**; ePA/gematik and other families are future modules, not implemented capabilities.

## Yoster setup

The root [`yappai.host.json`](yappai.host.json) registers the complete lab through [`infrastructure/docker-compose.host.yml`](infrastructure/docker-compose.host.yml). It reuses the local Keycloak/auth-client and standalone playground Compose definitions, with the optional backend profile cleared so Yoster's ordinary Start action starts every service.

| Service         | Container               | Purpose / default access                              |
| --------------- | ----------------------- | ----------------------------------------------------- |
| `keycloak`      | `epa-lab-keycloak`      | Authorization Server and IdP; `http://localhost:8080` |
| `auth-client`   | `epa-lab-auth-client`   | Existing NestJS OAuth client; `http://localhost:3000` |
| `res-server`    | `epa-lab-res-server`    | HAPI FHIR server; `http://localhost:8083/fhir`        |
| `res-server-db` | `epa-lab-res-server-db` | Persistent PostgreSQL for FHIR; Docker network only   |
| `playground`    | `epa-lab-playground`    | Fixture-only SPA; `https://auth-playground.yappai.de` |

Prepare the resource-server submodule and environment from the repository root:

```sh
git submodule update --init --recursive services/res-server
npm run env:init
docker compose --env-file .env -f infrastructure/docker-compose.host.yml config --quiet
```

`env:init` generates missing or blank local credentials, including `RES_SERVER_DB_PASSWORD`, while retaining existing values. The manifest explicitly supplies `.env` to Compose. The host needs the existing external `dev-proxy` network; Compose must support the manifests' `!reset`/`!override` tags and `gw_priority` (verified with Compose 5.6.1). Keycloak's original `epa-auth-lab_keycloak-data` volume is retained, and FHIR uses a separate persistent PostgreSQL volume. Database credentials must match the credentials used when their volume was initialized.

In Yoster, open **Auth Protocol Playground → Start → Build images before starting** for the first launch or after source changes. All five containers have Docker health checks; Yoster also checks the playground's internal HTTP endpoint. Build output for the resource server comes from its own Gradle-based submodule. The equivalent CLI commands are:

```sh
npm run host:up
npm run host:logs
npm run host:down
```

`host:down` stops/removes the host stack while preserving named data volumes. The `playground:*` scripts select the static UI definition, `infra:*` selects the Keycloak definition, and `docker:*` enables Keycloak plus the auth client. They share the `epa-lab` Compose project and stable container names; these are deployment lifecycle commands, not isolated verification commands. Use the [private integration guide](infrastructure/README.md) to test HAPI while preserving running services. `infra:reset` remains a destructive Keycloak data reset and is not part of that workflow.

Backend listeners default to loopback. `AUTH_CLIENT_HOST`/`AUTH_CLIENT_PORT`, `KEYCLOAK_BIND_ADDRESS`/`KEYCLOAK_PORT`, and `RES_SERVER_BIND_ADDRESS`/`RES_SERVER_PORT` control Docker access. The namespaced auth-client inputs prevent Yoster's own `PORT` from overriding this service; Compose maps them to `HOST`/`PORT` inside the container. Direct Node development still uses `HOST`/`PORT`. The auth client retains Linux host networking so its configured issuer is reachable from both the backend and browser.

For this host's LAN access, set the following in `.env` alongside the existing credentials:

```dotenv
AUTH_CLIENT_HOST=192.168.178.131
AUTH_CLIENT_PORT=3000
KEYCLOAK_BIND_ADDRESS=192.168.178.131
KEYCLOAK_PORT=5555
KEYCLOAK_HOSTNAME=http://192.168.178.131:5555
RES_SERVER_BIND_ADDRESS=192.168.178.131
RES_SERVER_PORT=8083
OIDC_ALLOW_PRIVATE_NETWORK_HTTP=true
OIDC_ISSUER=http://192.168.178.131:5555/realms/epa-demo
OIDC_DEFAULT_REDIRECT_URI=http://192.168.178.131:3000/callback
OIDC_ALLOWED_REDIRECT_URIS=["http://192.168.178.131:3000/callback"]
```

For an intentional host-stack configuration update, `docker compose --env-file .env -f infrastructure/docker-compose.host.yml up -d --wait` applies binding/environment changes by recreating affected containers; a plain restart retains their old configuration. With the example above, Keycloak is at `http://192.168.178.131:5555/`, auth-client readiness at `http://192.168.178.131:3000/health/ready`, and HAPI readiness at `http://192.168.178.131:8083/actuator/health/readiness`. Keep `KEYCLOAK_HOSTNAME`, `OIDC_ISSUER` and redirect URLs consistent as described in [the architecture guide](docs/architecture.md#lokale-infrastruktur). Only the fixture playground uses the existing public Traefik route. Task 9.5 recreated only the two approved backends. Bridge BFF/JWKS transport now passes after the owner-applied firewall correction; authenticated HAPI access and the persistent browser journey still require renewed verification. The private frontend remains withdrawn. The firewall-only follow-up authorizes no redeployment; use the targeted plan for any subsequently authorized rollout.

## Decisions already made in discussion

- **Product form:** browser-only web application; no Electron, mobile app, or desktop distribution.
- **Primary UX:** Mission Control, reached through a Mission Catalog.
- **Extensibility:** the workspace is mission-agnostic, while protocol logic belongs to each mission.
- **Initial technical direction:** React + TypeScript SPA → NestJS BFF → Keycloak (AS and IdP roles); protected demo Resource Server for the OAuth learning journey.
- **Development discipline:** preserve the implemented UI baseline and follow the approved local/private `001-oidc-pkce` specifications and task dependencies. Approval does not establish implemented or verified runtime behavior.

The owner accepted the reconciled first-mission design, contracts and ADR-0001/ADR-0002 on 2026-11-11. Future scope changes require their own review. Integrated private verification passes through task 9.4; the approved task 9.5 rollout was withdrawn after the actual persistent runtime failed connectivity acceptance.

## Read in this order

1. [`docs/product/vision-and-scope.md`](docs/product/vision-and-scope.md) — who the product serves, scope and outcomes.
2. [`docs/design/mission-catalog.md`](docs/design/mission-catalog.md) — catalog design and availability rules.
3. [`docs/design/mission-workspace.md`](docs/design/mission-workspace.md) — generic mission experience, inspector and timeline.
   - [`docs/design/visual-references.md`](docs/design/visual-references.md) — **view both embedded PNG designs before implementing UI**.
4. [`docs/design/visual-system.md`](docs/design/visual-system.md) — style decisions to review.
5. [`docs/architecture/system-context.md`](docs/architecture/system-context.md) — roles, trust boundaries and sequence.
6. [`docs/design/review-checklist.md`](docs/design/review-checklist.md) — sign-off checklist.
7. [`openspec/changes/001-oidc-pkce/proposal.md`](openspec/changes/001-oidc-pkce/proposal.md) — approved local/private integration plan; repository repair progress is recorded separately.

## Repository content (now)

```text
epa-lab/
├── README.md
├── EPA.md                         # existing ePA/PAR and browser-demo guide
├── package.json                   # epa-auth-lab root tooling
├── services/
│   ├── auth-client/               # NestJS; @epa-auth-lab/authorization
│   └── res-server/                # canonical HAPI FHIR Git submodule
├── apps/
│   ├── playground/                # fixture-only React SPA; separate npm workflow
│   └── fdv-android/               # placeholder only
├── infrastructure/                # Keycloak and existing Compose definitions
│   ├── README.md                  # isolated private integration lifecycle
│   ├── keycloak/
│   ├── docker-compose.yml
│   ├── docker-compose.host.yml
│   ├── docker-compose.integration.yml
│   └── docker-compose.playground.yml
├── docs/
│   ├── architecture.md            # existing ePA/PAR implementation
│   ├── architecture/              # accepted integration context and ADRs
│   ├── specifications.md          # legacy ePA requirement traceability
│   ├── api-clients/
│   ├── product/
│   └── design/
└── openspec/changes/001-oidc-pkce/ # approved plan, tasks and verification evidence
```

Filesystem paths use `services/auth-client` and `services/res-server`. Existing identifiers such as package `@epa-auth-lab/authorization`, Keycloak client `epa-auth-server`, API-client folder `epa-authorization` and the `/epa/authz/v1/...` endpoint are valid legacy identities, not stale paths.

## Existing auth-client tooling

The existing backend package lives in `services/auth-client`; its package identity remains `@epa-auth-lab/authorization`. The [backend guide](services/auth-client/README.md) documents validated opt-in profiles and the isolated standard login/callback/session/logout contract. Verification records cover [profiles](openspec/changes/001-oidc-pkce/auth-client-profiles-verification.md) and the [browser lifecycle](openspec/changes/001-oidc-pkce/browser-lifecycle-verification.md). Run these commands from the repository root with Node 24 and pinned pnpm 10.34.6:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
corepack pnpm lint
```

Enable Corepack's pnpm shim once with `corepack enable`, so nested package scripts can resolve `pnpm`. On Windows, `corepack.cmd pnpm` is the corresponding invocation; if the global shim directory is not writable, use the temporary-shim setup in the verification record. The lockfile importer and ESLint TypeScript project point to `services/auth-client`; no dependency versions or ePA/PAR application behavior change. Root formatting respects checkout line endings and excludes the independent HAPI/UI packages, generated tool files/caches and local preservation backup. The fixture UI keeps its separate npm workflow and formatter described above.

The [ePA guide](EPA.md) documents the implemented PAR smoke operation, legacy browser login/session demo and Postman/Bruno imports. The [repository verification record](openspec/changes/001-oidc-pkce/repository-verification.md) preserves baseline failures, recovered prerequisites, submodule preservation and per-task results. Current link/command alignment is recorded in [task 2.6 documentation verification](openspec/changes/001-oidc-pkce/documentation-verification.md).

### Local Docker verification

The existing Compose service is `auth-client`, image `epa-lab/auth-client:local`, built from [`services/auth-client/Dockerfile`](services/auth-client/Dockerfile). Build/runtime copies use `services/auth-client` and preserve the existing ePA profile and host-network configuration. HAPI and the local preservation backup are excluded from this Node image's build context.

Task 2.4's Compose validation, canonical auth-client image build, isolated startup/readiness, configured Keycloak connectivity and existing ePA/PAR regression checks passed on the Linux Dev Server. Configuration validation and the targeted image build use:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.yml --profile backend config --quiet
docker compose --env-file .env -f infrastructure/docker-compose.yml --profile backend build auth-client
```

The existing `pnpm docker:up` deployment command starts Keycloak and auth-client in the shared `epa-lab` project. For a targeted shutdown that retains its containers and data, use:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.yml --profile backend stop auth-client keycloak
```

`config --quiet` avoids printing expanded secrets. Check auth-client readiness at `/health/ready` on its configured local/private host and port. No Keycloak volume reset is needed.

### Private HAPI integration

Use [`infrastructure/README.md`](infrastructure/README.md) for the verified build, startup, health probes and shutdown commands. The separate `epa-lab-integration` project reuses the canonical HAPI/PG assets, publishes HAPI only on `127.0.0.1:18083`, and uses an internal database network with a disposable tmpfs database. It does not start or replace the existing Keycloak, auth-client or Playground. The existing host-networked auth-client can reach the loopback address; internal-network and auth-client connectivity and two clean lifecycle cycles are recorded in the [task 2.5 evidence](openspec/changes/001-oidc-pkce/repository-verification.md#task-25-completion--authorized-health-prerequisite-private-publication-and-lifecycle-2026-11-12).

Only exact GET/HEAD liveness/readiness probes are anonymous and return status only. The [HAPI security policy](services/res-server/SECURITY.md) now independently validates trusted Access Tokens and allows only `GET /fhir/Basic/playground-demo` with `demo.fhir.read`; all other data operations/interfaces are denied. New HAPI images require explicit `RES_SERVER_JWKS_URI` alongside the existing issuer; the integration profile seeds only its disposable fictional fixture through the internal DAO. The [BFF resource and observation contract](services/auth-client/README.md#protected-synthetic-resource) now connects that fixed read to the standard server-held session and owned safe events; see [verification evidence](openspec/changes/001-oidc-pkce/resource-observability-verification.md). Existing deployed containers have not been updated, and the public Playground stays fixture-only.

### Private standard Keycloak client

The existing `epa-demo` realm now also contains confidential client `playground-oidc`, with an exact `/api/oauth/callback`, required PKCE S256 and direct Authorization Code flow without PAR. Standard Access Tokens carry audience `playground-fhir`; the optional `demo.fhir.read` scope permits a separate valid narrower grant. The existing ePA client and required-PAR policy are preserved. See the [Keycloak guide](infrastructure/keycloak/README.md) for fresh setup, idempotent migration, rollback and isolated verification. Credentials remain server-side. The [auth-client profiles and backend browser lifecycle](services/auth-client/README.md) are verified in temporary private test processes. The standard profile stays disabled by default; the existing deployed containers and fixture UI have not been updated.

The SPA now has an [explicit private Vite binding](apps/playground/README.md#explicit-private-execution) for session restoration, authentication navigation, the synthetic read, local logout and safe owned observations. Default builds and the public deployment remain fixture-only. The temporary private browser journey passes and remote recursive checkout is verified. Persistent private availability awaits owner approval of the [single deployment plan](openspec/changes/001-oidc-pkce/private-deployment-plan.md); it has not been rolled out.

## Status and authority

`001-oidc-pkce` is APPROVED for local/private implementation; ADR-0001/ADR-0002 and its reconciled UX/security/spec baseline are accepted. Broader draft documents and unrelated changes retain their own status. Runtime implementation and verification are separate stages. In this project:

`DRAFT → REVIEWED → APPROVED → IMPLEMENTED → VERIFIED`

- Discussion is for decisions and design critique.
- Files in this repository are the implementation handoff source of truth.
- A mission is only marked **Available** after its end-to-end path has been verified.
- Design images are **exploratory**; textual requirements and approved decisions take precedence if they conflict.

## Integration note

The design handoff originated as a standalone starter. Repository inspection confirmed it now coexists with existing `epa-auth-lab` code. Slice 001 is an isolated UI package in `apps/playground`; existing backend services, configuration and infrastructure are preserved. The owner authorized static UI hosting at `auth-playground.yappai.de` and Yoster registration on 2026-10-19. Local/private backend integration is authorized by the 2026-11-11 `001-oidc-pkce` approval. Public hosting of real authentication remains excluded and requires separate authorization.

## UI Slice 001

The catalog and fixture-driven mission-agnostic workspace are implemented in [`apps/playground`](apps/playground/README.md). Review both previews and the [verification record](apps/playground/verification.md) against the [visual references](docs/design/visual-references.md). The local/private mission implementation and integrated checks pass through task 9.4; task 9.5 has not promoted persistent runnable availability. The existing public Playground remains fixture-only.
