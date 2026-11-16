# Task 9.5 — Approved private deployment and targeted rollback

Date: 2026-11-13. **Result: blocked; 49/50 tasks complete. Task 9.5 remains unchecked.**
The approved deployment passed process health checks but failed actual persistent-runtime
acceptance. Both targeted rollbacks completed. No availability promotion or archive.

## Approval, baseline and backups

The owner's explicit approval of the [consolidated private plan](private-deployment-plan.md#consolidated-owner-approval-recorded)
was recorded there **before implementation**. The saved approval-only diff confirms that
the packaging and environment had not yet changed. Only task 9.5 was executed; accepted
specifications, architecture, application code and dependency locks are unchanged.

Starting tree: clean `main...origin/main`, parent
`8892966a423c4d931d57f03c95ed99702d4d8d23`, clean canonical HAPI
`e65bafc279f02f44b19b47ca7326015886047a63`. The
[fresh recursive GitHub checkout](private-deployment-plan.md#git-reproducibility-blocker-resolved)
already resolved the Git reproducibility blocker; it remains resolved. No commit, staging,
push, pointer update or archive was performed during deployment.

Private artifacts are under `/tmp/epa-001-task95-deploy-20261113/` (directory mode 0700).
Before rollout, `backups/` saved the root environment, original SPA Dockerfile, full standard
client representation, managed scope identities, provider-preservation digest and original
image identities. Backup files are mode 0600. Original images remain available by immutable
ID; credentials and complete realm representations are not copied into repository evidence.

Both reviewed image tags were checked against these exact immutable identities **before**
environment/client mutation and again immediately before promotion:

| Image                                            | Verified identity                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------- |
| `epa-lab/auth-client:verify-001-task94-20261113` | `sha256:6f36daf27c60c54af72b2299f3ff7008eb9d6b5b03365b8333f6ec75531fb9c9` |
| `epa-lab/res-server:verify-001-task6-20261112`   | `sha256:df5b73ca4de42fcdaac3090a2acaa65696a68727372f130e112d1bdaa6e6e5f5` |
| Unchanged public `epa-lab/playground:local`      | `sha256:123ab1280bbe09df66dab4fa489d96d43cf122ee744fe5f6b22838b433a0c794` |

## Approved changes and actual rollout

The existing [SPA Dockerfile](../../../apps/playground/Dockerfile) gained only the reviewed
optional `private-runtime` stage. Its final default/public Nginx stage is unchanged. The
[private overlay](../../../infrastructure/docker-compose.private.yml) implements the approved
port `192.168.178.131:5173:5173`, private Vite proxy settings, non-root runtime, restart/health
checks and resource limits. It uses the existing `epa-lab_default` bridge, with no
`dev-proxy` attachment or public Traefik discovery.

The new private image built successfully as `epa-lab/playground-private:001-20261113`, ID
`sha256:bb0bbb9590266f2b98baa93e589048b0b01328119eb14bc0c3ced52644e8944e`.
No public image was rebuilt. Exactly the five approved environment values changed during
rollout. The existing standard client changed only `redirectUris`, to the single exact
port-5173 callback; `webOrigins` remained empty. Explicitly submitting that empty list
prevented the pinned Keycloak's omitted-field default from broadening it. Full before/after
comparison and the provider digest verified the limited change. ePA/PAR was untouched.

Actual configuration/build and targeted start commands, run from the repository root:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.host.yml -f infrastructure/docker-compose.private.yml --profile private-runtime config --quiet
docker compose --env-file .env -f infrastructure/docker-compose.host.yml -f infrastructure/docker-compose.private.yml --profile private-runtime build playground-private
docker image tag sha256:6f36daf27c60c54af72b2299f3ff7008eb9d6b5b03365b8333f6ec75531fb9c9 epa-lab/auth-client:local
docker image tag sha256:df5b73ca4de42fcdaac3090a2acaa65696a68727372f130e112d1bdaa6e6e5f5 epa-lab/res-server:local
docker compose --env-file .env -f infrastructure/docker-compose.host.yml -f infrastructure/docker-compose.private.yml --profile private-runtime up --no-deps --no-build --pull never -d --wait --wait-timeout 240 res-server
docker compose --env-file .env -f infrastructure/docker-compose.host.yml -f infrastructure/docker-compose.private.yml --profile private-runtime up --no-deps --no-build --pull never -d --wait --wait-timeout 180 auth-client
docker compose --env-file .env -f infrastructure/docker-compose.host.yml -f infrastructure/docker-compose.private.yml --profile private-runtime up --no-deps --no-build --pull never -d --wait --wait-timeout 180 playground-private
```

The task-private `deploy.mjs` performed the guarded environment/client update, immutable
image checks and these promotions/starts. All three targeted services reported healthy.
HAPI's guarded internal synthetic seeding was enabled; no anonymous seed route or clinical
data was used. Because the authenticated read failed, this session does **not** claim an
observed fixture body/version or idempotence result in the persistent database.

## Actual persistent acceptance failure

Verification used ordinary Chromium at `http://192.168.178.131:5173/missions`, the actual
deployed BFF and HAPI port 8083. It started no temporary BFF/Vite instance and used no browser
proxy or callback rewrite. The initial browser attempt failed at login/return. A diagnostic
replay failed waiting for the start control/session restoration; no authorization request
or successful callback 303 was observed. The first required rollback completed. The same
approved packet was deployed once more to obtain focused network/HAPI diagnosis, with no
application, network or security-policy change, and was then rolled back again.

| Actual check                                                                                                   | Result                                                                |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Exact approved backend images, private bind/network, three process health checks                               | Passed on both starts                                                 |
| HAPI anonymous GET/HEAD liveness and readiness                                                                 | 200, status-only GET / empty HEAD                                     |
| Anonymous synthetic FHIR read                                                                                  | 401                                                                   |
| Persistent Workspace/session restoration and login                                                             | Failed; start control remained disabled during unresolved restoration |
| Private frontend container → configured BFF `192.168.178.131:3000/health/ready`                                | Timed out after 3.5 seconds                                           |
| Same container → configured host JWKS `192.168.178.131:5555/realms/epa-demo/protocol/openid-connect/certs`     | Timed out after 3.5 seconds                                           |
| Same container → Keycloak peer `epa-lab-keycloak:8080` JWKS                                                    | 200, no credentials sent                                              |
| Real Keycloak Code exchange followed by protected HAPI read on 8083                                            | Expected 200; actual 401 with allowlisted `invalid-token` report      |
| HAPI failure chain                                                                                             | Trusted-key retrieval I/O failure ending in `HttpTimeoutException`    |
| Persistent authenticated reload, resource success/provenance, logout/history and frontend/BFF restart recovery | Not reached; unverified                                               |
| Persistent permission-403 and later direct-verifier negative cases                                             | Not reached after the first protected-read failure                    |

`epa-lab_default` is a non-internal bridge (`172.24.0.0/16`, gateway `172.24.0.1`). The
configured host endpoints are reachable from the host-networked BFF, but bridge access to
those host LAN endpoints failed. The HAPI log chain independently ties its 401 to JWKS
retrieval timing out. This is evidence of failed connectivity, not evidence that the
test Access Token's signature/claims were successfully evaluated and rejected.

Read-only inspection could not read the host's requested firewall chains; no exact blocking
firewall rule is established. No firewall, routing, bridge, issuer/JWKS trust substitution,
authentication bypass or UI workaround was applied. A reviewed connectivity correction is
required before another rollout; it is outside the approved packet executed here.

The target-specific direct HAPI verifier retained the canonical assertions and changed only
its target guard/log container. It failed the first positive read; the historical
107-assertion isolated result is **not** a passing result for this deployment.

## Targeted rollback and verified final state

Both failures triggered the plan's rollback. The task-private `rollback.mjs` stopped and
removed only the private frontend, restored the exact original standard-client callback
and empty web origins, disabled the standard profile and restored its old origin/callback/
resource values. It retained the corrected trusted JWKS and both reviewed patched images.
The temporary rollback overlay contains only `PLAYGROUND_DEMO_SEED: 'false'` for HAPI.

Actual targeted Docker rollback commands (the same sequence completed twice):

```bash
docker compose --env-file .env -f infrastructure/docker-compose.host.yml -f infrastructure/docker-compose.private.yml --profile private-runtime stop --timeout 15 playground-private
docker compose --env-file .env -f infrastructure/docker-compose.host.yml -f infrastructure/docker-compose.private.yml --profile private-runtime rm --force playground-private
docker compose --env-file .env -f infrastructure/docker-compose.host.yml -f infrastructure/docker-compose.private.yml -f /tmp/epa-001-task95-deploy-20261113/rollback.compose.yml --profile private-runtime up --no-deps --no-build --pull never -d --wait --wait-timeout 240 res-server
docker compose --env-file .env -f infrastructure/docker-compose.host.yml -f infrastructure/docker-compose.private.yml -f /tmp/epa-001-task95-deploy-20261113/rollback.compose.yml --profile private-runtime up --no-deps --no-build --pull never -d --wait --wait-timeout 180 auth-client
```

The private container is absent and port 5173 is closed. Both patched backends are process
healthy; standard execution and seeding are off. HAPI's retained trusted JWKS is nonempty
and matches the approved issuer origin, but protected token reads still require the
connectivity prerequisite. Any approved synthetic fixture remains in the database; no
resource/data/volume deletion or reset was performed. Old vulnerable images and blank JWKS
were not restored. Reapplying the private overlay alone would enable seeding again; retain
the documented rollback override when reproducing this withdrawn state.

All **43 other original containers** retain IDs, images, creation/start times, configuration
hashes, restart counts, mounts, networks and port bindings. Only the two authorized backends
were replaced. The final count is the original 45 containers, with no extra test container.
Keycloak and PostgreSQL containers and existing volume inventories are unchanged, as are
network inventories and public hosting/routing. The full restored standard client matches
its backup; all other clients, users, mappings and ePA PAR policy match the preservation
digest. Temporary fictional verification identities were removed.

## Regression, disclosure and validation evidence

Actual commands and bounded results include:

```bash
corepack pnpm --filter @epa-auth-lab/authorization test:integration --testPathPatterns=keycloak.integration.ts
node /tmp/epa-001-task95-deploy-20261113/verify-persistent-browser.mjs
node --env-file=.env /tmp/epa-001-task95-deploy-20261113/verify-deployed-hapi.mjs
python3 /tmp/epa-001-task95-deploy-20261113/verify-recovery.py
node /tmp/epa-001-task95-deploy-20261113/verify-provider-recovery.mjs
node /tmp/epa-001-task95-deploy-20261113/verify-public-and-health.mjs
```

The persistent-browser and direct-HAPI commands above failed as documented; recovery
checks passed. The existing six real Keycloak/ePA integration tests pass, including mandatory
PAR and legacy browser-demo behavior. They use temporary NestJS test instances and do not
establish persistent SPA acceptance. The opt-in public fixture browser check passes in
German/English with zero forbidden requests/browser errors and no authentication offered or
attempted. The public `/api/oauth/session` path still returns the same static HTML fallback
as `/missions`, without cookies. Deployed public Nginx matches its unchanged fixture-only
source and contains no OAuth proxy.

The actual deployed BFF contains `body-parser` 2.4.0, `multer` 2.5.0 and `qs` 6.16.1, with
NestJS unchanged at 11.2.7. A production audit of the lockfile/package manifest copied from
that deployed image reports **zero advisories**, including no high/critical findings.
The previously recorded **four moderate and one low development-only findings** remain
separate in the [dependency inventory](private-runtime-verification.md#separate-dependency-findings-and-completion-gate);
no dependency changes were made in this task.

Sanitized artifacts include `deployment-health.json`, `start-control-diagnostic.json`,
`private-network-diagnostic.json`, `hapi-failure-diagnostic.json`, failed browser summaries,
both `rollback-result.json` records, `recovery-verification.json`, `provider-recovery.json`,
`public-and-health.json`, regression/public logs and `audit-deployed-prod.json` under the
private task directory. Intermediate `deployed-awaiting-acceptance` status means only that
Compose starts passed; the final rollback/acceptance results control availability.

Final checks pass: root ESLint/Prettier, frontend formatting, `git diff --check`, strict
OpenSpec validation, 41 documents / 278 local links and 70 shell blocks / 116 package-command
references / 56 Compose-command references. Configuration validation passes for the backend,
host, isolated integration, public playground, approved private overlay and rollback overlay.
The actual private packaging matches the reviewed packet; the original default/public
Dockerfile is reproduced exactly by removing only the approved optional stage.

The disclosure scan finds no configured secret values, JWTs or raw callback queries in
76 changed-source/distribution files, retained diagnostic/result files, or available
post-rollback auth-client/HAPI/Keycloak/public-Playground logs. Full removed-container logs
are not available for a later rescan. Authenticated persistent-browser API/event disclosure
checks were not reached; the isolated results through task 9.4 remain historical evidence.
The backup environment/client representations remain private and are excluded from published
evidence. No authenticated screenshots or raw protocol bodies are retained as evidence.

Of 265 captured protected files, 257 remain byte-identical. Changes are confined to the
approved SPA packaging, private environment and documentation/status evidence; the new
files are the private overlay and this report. The earlier repository-verification content
is retained verbatim with an appended current-status link. All 50 task descriptions and
checkboxes are unchanged. Parent HEAD/index and the clean canonical HAPI commit are preserved.

**Remaining blocker:** private bridge-to-host BFF/JWKS connectivity must be resolved through
a reviewed plan before retrying actual persistent login, protected read, logout/history and
restart acceptance. No further deployment or unrelated implementation is included here.
Task **9.5 remains unchecked**, overall **49/50**, and the change is **not archived**.
