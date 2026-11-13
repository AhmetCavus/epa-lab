# Private HAPI integration verification

Run these commands from the repository root. [`docker-compose.integration.yml`](docker-compose.integration.yml)
extends the existing canonical HAPI and PostgreSQL definitions. Its separate
`epa-lab-integration` project, container names and image tag preserve the running
`epa-lab` services, Keycloak data and public fixture-only Playground.

For the component inventory and shared host-stack lifecycle, see the
[root guide](../README.md#yoster-setup). The existing ePA/PAR and browser-demo commands are
in [EPA.md](../EPA.md). This isolated profile starts only HAPI and its own PostgreSQL;
Keycloak must already be configured/running for provider checks. The BFF integration suites
start temporary loopback auth-client processes from the existing server-side configuration.

For the separate standard client in the existing Keycloak realm, see the
[Keycloak registration/migration guide](keycloak/README.md). The [auth-client profiles and backend browser lifecycle](../services/auth-client/README.md) are verified
separately in temporary loopback test processes. The [HAPI policy](../services/res-server/SECURITY.md)
validates Access Tokens and allows only the synthetic read. The BFF's fixed resource route
and owned safe event API and private SPA journey are verified through task 9.4. Final
operator availability remains blocked under task 9.5; the [dated runbook](../openspec/changes/001-oidc-pkce/private-runtime-verification.md)
records remote checkout, explicit JWKS setup, actual lifecycle evidence and remaining approvals.
No existing container is replaced by those checks and the public Playground stays fixture-only.

The profile requires the existing `.env` and `RES_SERVER_DB_PASSWORD`. For an
independent test password, pass a second private `--env-file` containing that
variable; do not overwrite the existing environment file. The new HAPI image also requires
`RES_SERVER_JWKS_URI`, copied from `jwks_uri` in the trusted `OIDC_ISSUER` discovery document.
Supply it through the shell environment or the second private env file and pass that file to
every Compose command. Its origin must match the issuer. Private IPv4 HTTP requires the
existing explicit `OIDC_ALLOW_PRIVATE_NETWORK_HTTP=true` opt-in. Missing/unsafe trust fails
startup; there is no unrelated issuer fallback. These source settings do not update deployed
containers until a separately intended rebuild/recreation.
Use URLs reachable from the HAPI container: `localhost` inside it refers to HAPI itself.
Reuse the configured private LAN issuer for this Dev Server; do not change token issuer
validation to work around connectivity.

```bash
docker compose --env-file .env -f infrastructure/docker-compose.integration.yml --profile integration config --quiet
docker compose --env-file .env -f infrastructure/docker-compose.integration.yml --profile integration build res-server
docker compose --env-file .env -f infrastructure/docker-compose.integration.yml --profile integration up --no-build --pull never -d --wait --wait-timeout 240 res-server
curl --fail --silent --show-error http://127.0.0.1:18083/actuator/health/liveness
curl --fail --silent --show-error http://127.0.0.1:18083/actuator/health/readiness
```

Set `INTEGRATION_FHIR_PORT` to another free port when necessary. HAPI is published
only at `127.0.0.1`; its default integration port is 18083, separate from the
existing server's 8083. The existing host-networked auth-client can reach that
loopback address. HAPI and PostgreSQL communicate through the internal `database`
network. A second dedicated bridge permits Docker's loopback publication without
joining the public proxy network. PostgreSQL has no published port; both services
disable Traefik discovery.

The database uses tmpfs and contains only disposable integration state. No existing
database volume is mounted. This profile explicitly enables the internal HAPI DAO seed for
fictional R4 `Basic/playground-demo`; the shared host stack leaves seeding off. There is no
anonymous write/seed route, and conflicting existing fixture content is never overwritten.
Restarting HAPI while leaving this database running does not add a fixture version.
Stopping the database container discards that test database;
repeated startup creates a fresh instance. Use only synthetic data in this profile.

Only exact GET/HEAD requests to `/actuator/health/liveness` and
`/actuator/health/readiness` are anonymous and return status only. The Java
`HealthCheck` probes readiness. The separate bearer-only application chain validates RS256,
trusted issuer/JWKS, `playground-fhir`, required expiry, not-before when present and Access
Token purpose. Only exact `GET /fhir/Basic/playground-demo` without query parameters and
with `demo.fhir.read` is authorized. All other data operations/interfaces, including MCP,
CDS, metadata/test UI and `/actuator/health`, are denied. See the HAPI policy for the fixed
401/403 decision headers, focused Gradle tests and real-Keycloak verification command.

With this secured integration instance healthy, run the BFF's real private integration suite:

```bash
corepack pnpm test:integration
```

The suite enables the standard profile only in its temporary process, using the configured
private client/callback and `PLAYGROUND_FHIR_RESOURCE_URL` (defaulting in tests to the
loopback synthetic read above). It exercises real Keycloak login/exchange and HAPI 200/401/403,
owned event provenance, safe responses/logs and existing ePA/PAR regressions. Temporary
fictional identities are deleted afterward. The tests neither update `.env` nor send
callbacks to the deployed auth-client or public fixture UI.

Stop and remove only the isolated setup:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.integration.yml --profile integration stop --timeout 15 res-server res-server-db
docker compose --env-file .env -f infrastructure/docker-compose.integration.yml --profile integration rm --force res-server res-server-db
docker network rm epa-lab-integration_database epa-lab-integration_loopback
```

These commands leave all original containers, volumes and public routes in place.
The integration image remains available for the next run. Verification evidence is
recorded in the historical [repository verification](../openspec/changes/001-oidc-pkce/repository-verification.md)
and the [Resource Server security verification](../openspec/changes/001-oidc-pkce/resource-server-verification.md).
See [BFF resource/observation verification](../openspec/changes/001-oidc-pkce/resource-observability-verification.md)
for the current backend connection and preservation results.
