# Private HAPI integration verification

Run these commands from the repository root. [`docker-compose.integration.yml`](docker-compose.integration.yml)
extends the existing canonical HAPI and PostgreSQL definitions. Its separate
`epa-lab-integration` project, container names and image tag preserve the running
`epa-lab` services, Keycloak data and public fixture-only Playground.

For the component inventory and shared host-stack lifecycle, see the
[root guide](../README.md#yoster-setup). The existing ePA/PAR and browser-demo commands are
in [EPA.md](../EPA.md). This isolated profile starts only HAPI and its own PostgreSQL;
Keycloak and auth-client must already be configured/running for provider/BFF checks. The
auth-client's reachability to HAPI is verified transport, not an implemented mission resource route.

For the separate standard client in the existing Keycloak realm, see the
[Keycloak registration/migration guide](keycloak/README.md). Its configuration does not yet
enable auth-client's standard mission profile or HAPI permission enforcement.

The profile requires the existing `.env` and `RES_SERVER_DB_PASSWORD`. For an
independent test password, pass a second private `--env-file` containing that
variable; do not overwrite the existing environment file.

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
database volume is mounted. Stopping its container discards that test database;
repeated startup creates a fresh instance. Use only synthetic data in this profile.

Only exact GET/HEAD requests to `/actuator/health/liveness` and
`/actuator/health/readiness` are anonymous and return status only. The Java
`HealthCheck` probes readiness. All other endpoints retain JWT authentication,
including `/actuator/health`, FHIR and MCP. This prerequisite does not establish
the mission's audience, permission or operation restrictions, and does not complete
OpenSpec task 6.4.

Stop and remove only the isolated setup:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.integration.yml --profile integration stop --timeout 15 res-server res-server-db
docker compose --env-file .env -f infrastructure/docker-compose.integration.yml --profile integration rm --force res-server res-server-db
docker network rm epa-lab-integration_database epa-lab-integration_loopback
```

These commands leave all original containers, volumes and public routes in place.
The integration image remains available for the next run. Verification evidence is
recorded in [repository-verification.md](../openspec/changes/001-oidc-pkce/repository-verification.md).
