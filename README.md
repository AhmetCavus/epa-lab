# Auth Protocol Playground

**Mission Control V2 is live (2026-11-17).** The owner-approved targeted SPA/BFF update
adds Explore, Inspect, recorded Flow and the session-enabled Resource Explorer to the
existing public OAuth workspace. The landing catalog is preserved. See the
[current release evidence](openspec/changes/mission-control-ux-v2/public-release-verification.md).

The public deployment at <https://auth-playground.yappai.de/missions> uses the existing
OAuth/OIDC mission, server-side OAuth client, Keycloak and protected synthetic FHIR
resource. Choose **OAuth-Mission starten** (English: **Start OAuth mission**) and then
start the login flow. The ePA mission remains conceptual. This is an experimental beta
with individual owner-provisioned demo accounts and synthetic data.

The owner authorized replacing the fixture deployment in place on 2026-11-16. See the
[current release evidence](openspec/changes/public-playground-oauth-deployment/live-release-verification.md)
for actual acceptance and the retained recovery history. The change is not archived.

Default local Vite development and the ordinary static build still support fixture-based
learning. Run `npm --prefix apps/playground ci` and `npm --prefix apps/playground run dev`,
then open <http://127.0.0.1:5173/missions>. See the [UI package guide](apps/playground/README.md).

**Explore protocols. Execute flows. Understand security.**

A browser learning playground with a Mission Catalog and reusable Mission Control Workspace.
The SPA presents the learning experience; the NestJS BFF is the OAuth client and holds
tokens server-side. Keycloak provides authorization and identity; HAPI independently
authorizes the fixed fictional resource read.

## Yoster setup

[`yappai.host.json`](yappai.host.json) manages the existing public site through
[`infrastructure/docker-compose.host.yml`](infrastructure/docker-compose.host.yml) and
private `.env.live`. The host profile includes the shared service definitions plus the
public and PostgreSQL-backed Keycloak overlays. Yoster Start and the root lifecycle
commands use the same live profile; there is one public playground container and hostname.

| Service         | Container               | Purpose / access                                                                                              |
| --------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| `keycloak`      | `epa-lab-keycloak`      | Production-mode Keycloak 26.8.2; public realm through the restricted proxy, administration on the private LAN |
| `auth-client`   | `epa-lab-auth-client`   | Server-side OAuth client; public `/api/oauth` through Nginx, private ePA endpoints retained                   |
| `res-server`    | `epa-lab-res-server`    | Protected synthetic FHIR resource; accessed by the BFF                                                        |
| `res-server-db` | `epa-lab-res-server-db` | Existing persistent PostgreSQL; separate `hapi` and `keycloak` databases, Docker network only                 |
| `playground`    | `epa-lab-playground`    | Live SPA and restricted same-origin proxy at `https://auth-playground.yappai.de`                              |

The existing host environment is provisioned in `.env.live` (0600, excluded from Git and
Docker build contexts). It contains immutable reviewed image identities, private credentials,
the existing HAPI datasource password and verified proxy peer addresses. Preserve this file
when updating the checkout. `.env` remains the local-development/recovery input; `env:init`
does not provision a public installation or replace `.env.live`.

```sh
docker compose --env-file .env.live -f infrastructure/docker-compose.host.yml config --quiet
npm run host:up
npm run host:logs
```

Yoster **Start** uses the same configuration. Live service builds are disabled in Compose;
source changes require explicitly building and verifying new images, then updating the
private immutable image pins. A restart retains configuration; `host:up` reconciles it.
The external `dev-proxy` network and existing PostgreSQL data volume must remain present.
Compose must support `include`, `!reset`, `!override` and `gw_priority` (verified with 5.6.1).
Nginx uses a reserved backend address and Docker DNS to follow Keycloak recreations.

`host:down` removes the host containers while retaining named volumes. `playground:up`
starts the complete live stack; `playground:down` stops only its public UI/proxy container.
`playground:logs` and `host:logs` show timestamps and the last 15 minutes by default.
The legacy `infra:*` and `docker:*` commands select development configurations with the
same service names; use the live host commands on this deployment. `infra:reset` deletes
Keycloak development data and is not a public lifecycle operation.

The existing LAN endpoints remain Keycloak `http://192.168.178.131:5555`, BFF readiness
`http://192.168.178.131:3000/health/ready` and HAPI readiness
`http://192.168.178.131:8083/actuator/health/readiness`. The public realm issuer and callback
use HTTPS on `auth-playground.yappai.de`. Private ePA uses its separate `epa-demo` issuer
and `http://192.168.178.131:3000/callback`. Keep these client/realm settings distinct.
The original H2 volume is retained for offline recovery; do not delete or attach it to the
PostgreSQL-backed provider. The existing PostgreSQL instance and HAPI data are preserved.

## Decisions already made in discussion

- **Product form:** browser-only web application; no Electron, mobile app, or desktop distribution.
- **Primary UX:** Mission Control, reached through a Mission Catalog.
- **Extensibility:** the workspace is mission-agnostic, while protocol logic belongs to each mission.
- **Initial technical direction:** React + TypeScript SPA → NestJS BFF → Keycloak (AS and IdP roles); protected demo Resource Server for the OAuth learning journey.
- **Development discipline:** preserve the implemented UI baseline and follow the approved local/private `001-oidc-pkce` specifications and task dependencies. Approval does not establish implemented or verified runtime behavior.

The owner accepted the reconciled first-mission design, contracts and ADR-0001/ADR-0002 on 2026-11-11. Future scope changes require their own review. Private implementation and acceptance pass through task 9.5; historical failed rollouts and successful rollback remain documented alongside final acceptance.

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
│   ├── playground/                # React SPA; live public OAuth, separate npm workflow
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

Only exact GET/HEAD liveness/readiness probes are anonymous and return status only. The [HAPI security policy](services/res-server/SECURITY.md) now independently validates trusted Access Tokens and allows only `GET /fhir/Basic/playground-demo` with `demo.fhir.read`; all other data operations/interfaces are denied. New HAPI images require explicit `RES_SERVER_JWKS_URI` alongside the existing issuer; the integration profile seeds only its disposable fictional fixture through the internal DAO. The [BFF resource and observation contract](services/auth-client/README.md#protected-synthetic-resource) now connects that fixed read to the standard server-held session and owned safe events; see [verification evidence](openspec/changes/001-oidc-pkce/resource-observability-verification.md). The public deployment reuses this policy with the public realm issuer; resource-server source remains independently maintained.

### Private standard Keycloak client

The existing `epa-demo` realm now also contains confidential client `playground-oidc`, with an exact `/api/oauth/callback`, required PKCE S256 and direct Authorization Code flow without PAR. Standard Access Tokens carry audience `playground-fhir`; the optional `demo.fhir.read` scope permits a separate valid narrower grant. The existing ePA client and required-PAR policy are preserved. See the [Keycloak guide](infrastructure/keycloak/README.md) for fresh setup, idempotent migration, rollback and isolated verification. Credentials remain server-side. The [auth-client profiles and backend browser lifecycle](services/auth-client/README.md) are verified in temporary private test processes. The standard profile is enabled by the public deployment overlay with its separate public realm; it remains opt-in in development.

The SPA has an [explicit private Vite binding](apps/playground/README.md#explicit-private-execution) for session restoration, authentication navigation, the synthetic read, local logout and safe owned observations. Default local builds use fixtures; the live public deployment uses the explicit public OAuth build. The owner-approved [deployment plan](openspec/changes/001-oidc-pkce/private-deployment-plan.md) has passed actual persistent acceptance and fresh recursive checkout; the private entry remains running after verification.

## Status and authority

`001-oidc-pkce` is APPROVED for local/private implementation; ADR-0001/ADR-0002 and its reconciled UX/security/spec baseline are accepted. Broader draft documents and unrelated changes retain their own status. Runtime implementation and verification are separate stages. In this project:

`DRAFT → REVIEWED → APPROVED → IMPLEMENTED → VERIFIED`

- Discussion is for decisions and design critique.
- Files in this repository are the implementation handoff source of truth.
- A mission is only marked **Available** after its end-to-end path has been verified.
- Design images are **exploratory**; textual requirements and approved decisions take precedence if they conflict.

## Integration note

The design handoff originated as a standalone starter. Repository inspection confirmed it now coexists with existing `epa-auth-lab` code. Slice 001 is an isolated UI package in `apps/playground`; existing backend services, configuration and infrastructure are preserved. The owner authorized static UI hosting at `auth-playground.yappai.de` and Yoster registration on 2026-10-19. Local/private backend integration is authorized by the 2026-11-11 `001-oidc-pkce` approval. The separately approved 2026-11-16 public release now replaces the hosted fixture deployment; see the current release evidence above.

## UI Slice 001

The catalog and mission-agnostic workspace are implemented in [`apps/playground`](apps/playground/README.md). Review both previews and the [verification record](apps/playground/verification.md) against the [visual references](docs/design/visual-references.md). Local/private implementation and persistent-runtime acceptance pass through task 9.5. The public OAuth build executes the existing mission through the same BFF; local fixture builds remain available.
