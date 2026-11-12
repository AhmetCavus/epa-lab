# Auth Protocol Playground

> **Project state:** `001-oidc-pkce` is **APPROVED for local/private implementation** as of 2026-11-11. ADR-0001/ADR-0002, the reconciled UX/visual baseline, security architecture and revised specs are accepted; readiness tasks 1.1–1.4 are complete. Repository tasks 2.1–2.3 are complete; task 2.4 path repairs await Docker verification. New OAuth integration remains unimplemented. The existing [`apps/playground`](apps/playground/README.md) remains fixture-only, including its public deployment; public real authentication is not authorized. See the [owner approval record](openspec/changes/001-oidc-pkce/readiness-review.md#consolidated-owner-approval-summary) and [repository verification](openspec/changes/001-oidc-pkce/repository-verification.md).

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

`env:init` generates missing or blank local credentials, including `RES_SERVER_DB_PASSWORD`, while retaining existing values. The manifest explicitly supplies `.env` to Compose. The host needs the existing external `dev-proxy` network; the Compose CLI must support `!reset` overrides. Keycloak's original `epa-auth-lab_keycloak-data` volume is retained, and FHIR uses a separate persistent PostgreSQL volume. Database credentials must match the credentials used when their volume was initialized.

In Yoster, open **Auth Protocol Playground → Start → Build images before starting** for the first launch or after source changes. All five containers have Docker health checks; Yoster also checks the playground's internal HTTP endpoint. Build output for the resource server comes from its own Gradle-based submodule. The equivalent CLI commands are:

```sh
npm run host:up
npm run host:logs
npm run host:down
```

`host:down` preserves named data volumes. The existing `playground:*` commands manage only the static UI, `infra:*` manages Keycloak, and `docker:*` manages Keycloak plus the auth client. They share the `epa-lab` Compose project and stable container names; use `host:*` or Yoster to operate the complete stack. `infra:reset` remains a destructive Keycloak data reset.

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

Apply binding or environment changes with `docker compose --env-file .env -f infrastructure/docker-compose.host.yml up -d --wait`; recreating the affected containers applies these settings. A plain restart retains their old configuration. Keycloak is then at `http://192.168.178.131:5555/`, auth-client readiness at `http://192.168.178.131:3000/health/ready`, and FHIR health at `http://192.168.178.131:8083/actuator/health`. Keep `KEYCLOAK_HOSTNAME`, `OIDC_ISSUER` and redirect URLs consistent as described in [the architecture guide](docs/architecture.md#lokale-infrastruktur). Only the playground uses the existing public Traefik route. Launching these services does not connect the fixture UI to the backend or establish a protected FHIR mission; resource-server security remains the submodule's responsibility.

## Decisions already made in discussion

- **Product form:** browser-only web application; no Electron, mobile app, or desktop distribution.
- **Primary UX:** Mission Control, reached through a Mission Catalog.
- **Extensibility:** the workspace is mission-agnostic, while protocol logic belongs to each mission.
- **Initial technical direction:** React + TypeScript SPA → NestJS BFF → Keycloak (AS and IdP roles); protected demo Resource Server for the OAuth learning journey.
- **Development discipline:** preserve the implemented UI baseline and follow the approved local/private `001-oidc-pkce` specifications and task dependencies. Approval does not establish implemented or verified runtime behavior.

The owner accepted the reconciled first-mission design, contracts and ADR-0001/ADR-0002 on 2026-11-11. Future scope changes require their own review; runtime verification remains pending.

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
auth-protocol-playground/
├── README.md
├── AGENTS.md
├── docs/
│   ├── product/
│   │   └── vision-and-scope.md
│   ├── design/
│   │   ├── mission-catalog.md
│   │   ├── mission-workspace.md
│   │   ├── visual-references.md
│   │   ├── visual-system.md
│   │   ├── review-checklist.md
│   │   ├── fixtures/
│   │   │   ├── oauth-oidc.md
│   │   │   └── epa-concept.md
│   │   └── assets/                 # exploratory artwork, not final UI spec
│   └── architecture/
│       ├── system-context.md
│       └── decisions/
│           ├── ADR-0001-spa-bff-keycloak.md
│           └── ADR-0002-mission-boundaries.md
└── openspec/
    ├── project.md
    └── changes/
        └── 001-oidc-pkce/
            ├── proposal.md
            ├── design.md
            ├── tasks.md
            └── specs/
                ├── mission-experience/spec.md
                └── authorization-flow/spec.md
```

The tree above describes the design handoff. This checkout also contains existing `services/auth-client`, the `services/res-server` submodule, `infrastructure/`, root tooling, an Android placeholder, and the isolated `apps/playground` UI. Slice 001 uses no backend integration and preserves those existing components.

## Existing auth-client tooling

The existing backend package lives in `services/auth-client`; its package identity remains `@epa-auth-lab/authorization`. Run these commands from the repository root with Node 24 and pinned pnpm 10.34.6:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
corepack pnpm lint
```

Enable Corepack's pnpm shim once with `corepack enable`, so nested package scripts can resolve `pnpm`. On Windows, `corepack.cmd pnpm` is the corresponding invocation; if the global shim directory is not writable, use the temporary-shim setup in the verification record. The lockfile importer and ESLint TypeScript project point to `services/auth-client`; no dependency versions or ePA/PAR application behavior change. Root formatting respects checkout line endings and excludes the independent HAPI/UI packages, generated tool files/caches and local preservation backup. The fixture UI keeps its separate npm workflow and formatter described above.

The [repository verification record](openspec/changes/001-oidc-pkce/repository-verification.md) contains baseline failures, recovered local tool prerequisites, submodule preservation details and per-task results. Broader stale documentation links remain task 2.6 work.

### Local Docker verification

The existing Compose service remains `epa-authorization`, image `epa-auth-lab/authorization:local`; its Dockerfile is now `services/auth-client/Dockerfile`. Build/runtime copies use `services/auth-client` and preserve the existing ePA profile and host-network configuration. HAPI and the local preservation backup are excluded from this Node image's build context.

Docker is not installed in the current verification environment, so task 2.4's Compose/build/readiness checks remain pending. On a host with Docker/Compose and support for the existing host-network setup, initialize the local `.env` with `pnpm env:init` if needed and use local/private listener values, then run:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.yml --profile backend config --quiet
docker compose --env-file .env -f infrastructure/docker-compose.yml --profile backend build epa-authorization
pnpm docker:up
curl --fail --silent http://127.0.0.1:3000/health/ready
```

Use the configured local host/port if different. `config --quiet` avoids printing expanded secrets; do not reset the existing Keycloak volume. These are pending local verification commands, not public deployment authorization. The static public Playground stack remains fixture-only and unchanged.

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

The catalog and fixture-driven mission-agnostic workspace are implemented in [`apps/playground`](apps/playground/README.md). Review both previews and the [verification record](apps/playground/verification.md) against the [visual references](docs/design/visual-references.md). Local/private authentication/backend implementation is authorized under `001-oidc-pkce`; this slice repairs repository/build paths without adding OAuth features. The existing public Playground remains fixture-only.
