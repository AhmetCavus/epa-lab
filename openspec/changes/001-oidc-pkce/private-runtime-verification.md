# Task 9.5 — Private runtime availability and reproducibility

**Date:** 2026-11-13. **Status:** blocked; **49/50** tasks complete. Task 9.5 remains
unchecked. The owner requested only this task, with no push or modification/recreation of
existing containers without explicit approval. No archive, availability promotion, new
feature, dependency change, security-policy change or public deployment is performed.

## Baseline and decision

The checkout started clean on `main`, tracking `origin/main`, at
`370896b39d632de975271610b9e3616d32b4f404`. The parent remote advertises that same `main`
commit. The canonical HAPI submodule is clean at
`e65bafc279f02f44b19b47ca7326015886047a63` on `feat/enable-oauth`.
OpenSpec selected the existing repository root, `spec-driven`, ready, **49/50** complete,
with only task 9.5 pending and no additional context/operation guidance. The baseline records
45 original containers, their configurations/bindings, network/volume inventories and
263 protected-file hashes.

The real private browser journey and public fixture boundary pass again. This verifies the
existing implementation in its isolated test binding; it does not establish a persistently
available operator runtime or remote recursive reproducibility. Those distinctions prevent
marking task 9.5 complete or changing the catalog's availability label.

## Blocker 1 — Canonical HAPI commit is not on its configured remote

Configured `origin` and the unchanged parent `.gitmodules` both name
`https://github.com/AhmetCavus/hapi-fhir-jpaserver-secured-starter`.

| Check                                               | Actual result                                      |
| --------------------------------------------------- | -------------------------------------------------- |
| Advertised remote refs                              | Two branch refs; neither advertises `e65bafc…`     |
| Remote `refs/heads/feat/enable-oauth`               | `d609c23ae82cbd4f9cd5da26e09306b24029d131`         |
| Local canonical commit                              | `e65bafc279f02f44b19b47ca7326015886047a63`         |
| Canonical commit's parent                           | Exactly `d609c23ae82cbd4f9cd5da26e09306b24029d131` |
| Exact remote fetch into a new empty bare repository | Fails: **not our ref**                             |
| Push                                                | **Not executed**                                   |

The required publication is a **single-commit fast-forward** of the existing feature branch.
The commit contains 20 changed files, 1698 insertions and 181 deletions; its security review
and tests are recorded in the [task 6.6 review](resource-server-verification.md#task-66--review-commit-pin-and-fresh-checkout)
and the [task 9.4 regressions](dependency-remediation-verification.md). This task introduces
no new HAPI source change or parent gitlink change.

**Proposed command; requires owner approval and has not run:**

```bash
git -C services/res-server push origin e65bafc279f02f44b19b47ca7326015886047a63:refs/heads/feat/enable-oauth
```

No force push is needed. Recheck the remote ref before any approved push; a normal push
rejects an incompatible intervening branch change. After publication, repeat the exact
remote fetch and fresh recursive checkout. Local repository substitution, cached images and
prior successful local recursive clones do not satisfy this remote-availability gate.

## Existing deployment finding — HAPI has empty trust configuration

The existing `epa-lab-res-server` is separate from the disposable integration service.
Its deployed `FHIR_OIDC_ISSUER` is nonempty, but **`FHIR_OIDC_JWKS_URI` is empty**.
The root `.env` has no `RES_SERVER_JWKS_URI` entry; the existing host Compose definition maps
`${RES_SERVER_JWKS_URI:-}` into that deployed variable. Spring's
`ResourceServerTrustProperties` rejects it with:

> Resource Server issuer, JWKS and playground-fhir audience must be configured safely

Its existing `unless-stopped` policy causes repeated startup attempts. The Docker baseline
already records 159 restarts. This is a fail-closed configuration failure, not evidence that
FHIR authentication should be disabled. No existing container, environment file, database
or policy is changed to repair it.

Trusted issuer discovery returns **200**, with a matching issuer and same-origin JWKS URI:

```text
http://192.168.178.131:5555/realms/epa-demo/protocol/openid-connect/certs
```

The isolated runtime receives that URI through a separate private environment file and
starts successfully. This finding prevents using the shared host HAPI as the mission
backend; it does not invalidate the passing isolated profile or authorize an additional
deployment change. A proposed correction to the existing deployment would add only
`RES_SERVER_JWKS_URI` with this discovered value, then deliberately recreate only its HAPI
container. A plain restart retains the old environment. **That correction/recreation needs
explicit authorization and is not executed here.** It would neither reset PostgreSQL nor
enable the isolated demo seed in the existing database.

For review, the targeted deployment command after an approved environment correction is:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.host.yml up --no-deps --no-build --pull never -d --wait --wait-timeout 240 res-server
```

This is a proposed repair, not an isolated-test startup command or a claim of verified
deployed health. No shared-stack `up`, `down`, restart or volume operation runs in this task.

## Blocker 2 — Private binding and operator availability

The approved callback origin remains **`http://192.168.178.131:3000`**, with exact callback
`/api/oauth/callback`. That address is occupied by the existing deployed auth-client, whose
`PLAYGROUND_OIDC_ENABLED` flag is **false**. The public SPA is a separate static container.

The existing private Vite binding runs only in explicit `private` serving mode, binds to
loopback, proxies only `/api/oauth`, and checks the browser's exact canonical origin.
Production/static builds compile execution off. The existing browser verifier starts
temporary instances of the same BFF and Vite, then uses a native browser HTTP proxy to map
the unchanged canonical origin to those task-owned listeners. It preserves normal browser
navigation, native Origin, cookie scope and the registered callback; it does not intercept
or rewrite callbacks or relax provider/browser security.

This is the verified **temporary integration binding**. Its processes terminate on test
completion. It is not a persistent private URL that an ordinary browser can open afterward.
Opening the public site or an arbitrary alternate Vite origin does not enable execution.

**Open Decision — operator access:** select and authorize the concrete persistent private
application binding before promoting runnable availability. Reusing the occupied canonical
address would require approved changes to its existing deployment; selecting another origin
requires an exact matching callback registration and server-selected profile configuration.
Neither change is silently made, and the public fixture route is not a candidate for it.
The test-only catalog link and honest Fixture preview/Planned availability remain intact.

The existing auth-client also retains the pre-remediation production dependency versions:
`body-parser` **2.3.0**, `multer` **2.4.0** and both QS consumers **6.16.0**. Read-only
runtime resolution confirms these versions; NestJS/Express remain 11.2.7/5.2.1 and Zod is
4.6.6. Its actual production virtual-store lockfile is audited separately below. The clean
checkout audit is not evidence that an unchanged deployed image has been patched. An
approved rebuild/image rollout and container recreation are still required to remediate
that existing deployment; none is performed under the current preservation constraint.

## Actual verification results

| Requirement                                      | Fresh result                                                                                                      |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Existing backend source builds                   | Pass                                                                                                              |
| Isolated HAPI / PostgreSQL startup               | Both healthy; existing verified fork image, no upstream substitution                                              |
| Health and security independence                 | Liveness/readiness **200**; anonymous synthetic FHIR read **401 / missing-token**                                 |
| Isolation                                        | HAPI only **127.0.0.1:18083**; PostgreSQL unpublished, tmpfs only, no existing volume; dedicated networks         |
| Real Keycloak login / standard Code + S256       | Pass; one normal login navigation, **zero PAR**                                                                   |
| Clean Workspace return / refresh                 | Pass; same run and event identities without repeated protocol work                                                |
| Real protected resource                          | One synthetic read **200**, explicit HAPI report `allowed/demo-read-allowed`                                      |
| Actual event provenance                          | 9 login / 12 post-read observations; BFF observer and separate HAPI reporter                                      |
| Local logout / safe history                      | Subsequent BFF read **401**, no second HAPI call; 14 owned safe observations retained                             |
| Disclosure / provider preservation               | Actual-value in-memory log/browser checks pass; only locale in browser storage                                    |
| Actual public fixture browser                    | Pass; German/English, fixture OAuth/conceptual ePA, zero forbidden requests/browser errors                        |
| Public API routing                               | Deployed Nginx exactly matches static source; no `proxy_pass` or OAuth route; Traefik targets only the static SPA |
| Public session-path probe                        | **200 text/html**, exactly the static index, no session cookie; no login started                                  |
| Remote recursive reproducibility                 | **Blocked** by unavailable canonical HAPI commit                                                                  |
| Persistent operator binding / runnable promotion | **Not enabled or claimed**; decision/authorization above remains necessary                                        |

The reused browser verifier retains its original focused task-8 scope label in JSON; this
dated execution supplies task-9.5 evidence. Sanitized results and clean Workspace screenshots
are retained under [private browser evidence](../../../apps/playground/.cache/task95-private-runtime/real/)
and [public fixture evidence](../../../apps/playground/.cache/task95-private-runtime/public/).
No provider password screenshot, HAR, trace, raw callback or complete HTTP body is retained.
No full group-9.4 suite rerun is claimed; unchanged source/dependency checks remain in the
preserved [task 9.4 report](dependency-remediation-verification.md).

## Reproducible checkout and isolated lifecycle

The following remote checkout is the intended recipe **after** the missing commit is
published. It is not currently verified to succeed. Run it in a new directory, then provide
the existing server-side `.env` securely; do not commit credentials or generate replacement
credentials for existing volumes.

```bash
git clone --no-checkout https://github.com/AhmetCavus/epa-lab.git epa-lab-private
git -C epa-lab-private checkout --detach 370896b39d632de975271610b9e3616d32b4f404
git -C epa-lab-private submodule update --init --recursive
cd epa-lab-private
corepack pnpm install --frozen-lockfile
npm --prefix apps/playground ci
corepack pnpm build
```

For the isolated HAPI profile, obtain `RES_SERVER_JWKS_URI` only from the trusted configured
issuer's discovery document. Check the returned issuer and JWKS origin; do not guess a new
issuer or accept credentials in a URL. Store the setting in a mode-0600 second environment
file outside version control and pass it to **every** Compose command. On this server the
actual test file is `/tmp/epa-001-task95-20261113/integration.env` in a mode-0700 directory.
It contains only the discovered JWKS setting; the existing root `.env` remains unchanged.

A new local directory/file can be prepared without copying any credentials into it:

```bash
PLAYGROUND_RUN_DIRECTORY=$(mktemp -d /tmp/epa-private-runtime.XXXXXX)
node --env-file=.env --input-type=module - "$PLAYGROUND_RUN_DIRECTORY/integration.env" <<'JS'
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const issuer = process.env.OIDC_ISSUER;
const response = await fetch(`${issuer}/.well-known/openid-configuration`, {
  signal: AbortSignal.timeout(10000),
});
assert.ok(response.ok);
const metadata = await response.json();
assert.equal(metadata.issuer, issuer);
const jwks = new URL(metadata.jwks_uri);
assert.equal(jwks.origin, new URL(issuer).origin);
assert.equal(jwks.username, '');
assert.equal(jwks.password, '');
await writeFile(process.argv[2], `RES_SERVER_JWKS_URI=${jwks.href}\n`, {
  mode: 0o600,
  flag: 'wx',
});
JS
```

Abort if the dedicated integration names/networks or port 18083 are already owned by
another run. A fresh setup builds and starts the canonical existing assets with:

```bash
docker compose --env-file .env --env-file "$PLAYGROUND_RUN_DIRECTORY/integration.env" -f infrastructure/docker-compose.integration.yml --profile integration config --quiet
docker compose --env-file .env --env-file "$PLAYGROUND_RUN_DIRECTORY/integration.env" -f infrastructure/docker-compose.integration.yml --profile integration build res-server
docker compose --env-file .env --env-file "$PLAYGROUND_RUN_DIRECTORY/integration.env" -f infrastructure/docker-compose.integration.yml --profile integration up --no-build --pull never -d --wait --wait-timeout 240 res-server
PLAYGROUND_VERIFY_PRIVATE=true npm --prefix apps/playground run test:private
docker compose --env-file .env --env-file "$PLAYGROUND_RUN_DIRECTORY/integration.env" -f infrastructure/docker-compose.integration.yml --profile integration stop --timeout 15 res-server res-server-db
docker compose --env-file .env --env-file "$PLAYGROUND_RUN_DIRECTORY/integration.env" -f infrastructure/docker-compose.integration.yml --profile integration rm --force res-server res-server-db
docker network rm epa-lab-integration_database epa-lab-integration_loopback
rm "$PLAYGROUND_RUN_DIRECTORY/integration.env"
rmdir "$PLAYGROUND_RUN_DIRECTORY"
```

This run reused the previously verified fork image through a private image-only override,
`/tmp/epa-001-task95-20261113/image.compose.yaml`, pointing `res-server` to
`epa-lab/res-server:verify-001-task6-20261112`. No image is rebuilt or deployed here.
The actual startup, verification and cleanup commands are:

```bash
docker compose --env-file .env --env-file /tmp/epa-001-task95-20261113/integration.env -f infrastructure/docker-compose.integration.yml -f /tmp/epa-001-task95-20261113/image.compose.yaml --profile integration config --quiet
docker compose --env-file .env --env-file /tmp/epa-001-task95-20261113/integration.env -f infrastructure/docker-compose.integration.yml -f /tmp/epa-001-task95-20261113/image.compose.yaml --profile integration up --no-build --pull never -d --wait --wait-timeout 240 res-server
curl --fail --silent --show-error --output /dev/null --write-out '%{http_code}\n' http://127.0.0.1:18083/actuator/health/liveness
curl --fail --silent --show-error --output /dev/null --write-out '%{http_code}\n' http://127.0.0.1:18083/actuator/health/readiness
(cd apps/playground
PLAYGROUND_VERIFY_PRIVATE=true npm run test:private
PLAYGROUND_VERIFY_PUBLIC_FIXTURES=true node tests/verify-public-fixtures.mjs
)
docker compose --env-file .env --env-file /tmp/epa-001-task95-20261113/integration.env -f infrastructure/docker-compose.integration.yml -f /tmp/epa-001-task95-20261113/image.compose.yaml --profile integration stop --timeout 15 res-server res-server-db
docker compose --env-file .env --env-file /tmp/epa-001-task95-20261113/integration.env -f infrastructure/docker-compose.integration.yml -f /tmp/epa-001-task95-20261113/image.compose.yaml --profile integration rm --force res-server res-server-db
docker network rm epa-lab-integration_database epa-lab-integration_loopback
```

The browser commands actually ran from `apps/playground` using `npm run test:private` and
`node tests/verify-public-fixtures.mjs`; use that working directory for the documented
ignored screenshot locations. The test helper stops its BFF, Vite and browser and removes
its fictional identity. Stopping/removing the isolated pair discards only its tmpfs database.
Only those two empty integration networks are removed; no existing stack or volume is reset.

### Rollback

No runnable availability was promoted, no original deployment was changed, and no source or
submodule pointer rollback is required. For the transient check, the targeted stop/remove
commands above are the rollback. Process exit discards the test BFF's credentials, sessions
and bounded in-memory runs. Existing ePA/PAR configuration, Keycloak data and public fixtures
remain intact. To use fixture mode, run the existing normal `dev`/static build without the
explicit private binding; do not add public API routes or weaken HAPI to recover availability.

## Preservation and documentation checks

All **45** original container IDs, images, immutable configurations, creation times, mounts,
network memberships and port bindings match the baseline. Network/volume inventories match;
only the two disposable integration containers and their empty networks were removed.
The original HAPI's recorded startup time/restart count advance under its existing failing
configuration and restart policy; this lifecycle exception is explicit, not a claim that
every deployed service remained healthy. The other original containers retain their
baseline lifecycle state. Provider digests confirm original clients/scopes/policies/users/
mappings are unchanged and the fictional identity is removed.

Of **263** protected files, **259** remain byte-identical. The only changed baseline files
are the root/UI/infrastructure READMEs and the task evidence note; this runbook is new.
All application/test code, dependencies/lockfiles, Docker assets, ADRs/UX/specifications,
historical reports, root `.env`, hosting manifest and external Traefik routing are preserved.
The parent HEAD/index, HAPI commit/clean tree and all 50 task descriptions/checkboxes remain
unchanged. No commit or push is made.

Root lint/format, frontend formatting and strict OpenSpec validation pass. Documentation
checks pass for **39 documents / 262 local links**, **65 shell blocks**, **116 package-command
references** and **42 Compose-command references**. All four existing Compose configurations
validate without expanded secrets in output. The documented discovery recipe is executed
separately and produces exactly the trusted JWKS setting with directory/file modes
**0700/0600**; its disposable configuration is removed afterward. This validates the recipe,
not the blocked remote checkout or the proposed existing-deployment repair.

The final source/distribution/log/result disclosure scan passes; the real browser also checks
actual temporary sensitive values in memory. Expanded Compose configurations used only by
the command checker are private and are removed after validation. Raw credentials, token
contents, callbacks and HTTP bodies are not published.

Actual read-only Git checks and the controlled fetch failure use:

```bash
git ls-remote --refs https://github.com/AhmetCavus/hapi-fhir-jpaserver-secured-starter
git init --bare --quiet /tmp/epa-001-task95-20261113/remote-probe.git
git -C /tmp/epa-001-task95-20261113/remote-probe.git fetch --no-tags https://github.com/AhmetCavus/hapi-fhir-jpaserver-secured-starter e65bafc279f02f44b19b47ca7326015886047a63
corepack pnpm build
corepack pnpm audit --prod --json
corepack pnpm audit --json
docker cp epa-lab-auth-client:/app/node_modules/.pnpm/lock.yaml /tmp/epa-001-task95-20261113/deployed-auth-client/pnpm-lock.yaml
docker cp epa-lab-auth-client:/app/services/auth-client/package.json /tmp/epa-001-task95-20261113/deployed-auth-client/services/auth-client/package.json
corepack pnpm --dir /tmp/epa-001-task95-20261113/deployed-auth-client audit --prod --json
corepack pnpm lint
npm --prefix apps/playground run format:check
KEYCLOAK_ADMIN_URL=http://127.0.0.1:5555 node --env-file=.env /tmp/epa-001-task95-20261113/verify-keycloak.mjs
python3 /tmp/epa-001-task95-20261113/check-links.py --report /tmp/epa-001-task95-20261113/links.json
python3 /tmp/epa-001-task95-20261113/check-commands.py
node /tmp/epa-001-task95-20261113/verify-disclosure.mjs
python3 /tmp/epa-001-task95-20261113/verify-preservation.py
OPENSPEC_TELEMETRY=0 npm exec --offline --yes --cache /tmp/epa-001-task24-npm-cache --package @fission-ai/openspec@1.14.1 -- openspec validate 001-oidc-pkce --strict
git diff --check
```

Private result files stay under `/tmp/epa-001-task95-20261113/`. The controlled failed fetch
is repeated at the end: the remote still ends at `d609c23…` and rejects `e65bafc…`.
OpenSpec still reports **49/50**, with only task 9.5 pending. No unavailable acceptance
condition is silently waived to claim completion.

## Separate dependency findings and completion gate

The checkout's production Node audit is **clean: zero vulnerabilities**. Its three approved
transitives resolve to 2.4.0/2.5.0/6.16.1. This is separate from the deployed legacy image:

| Audited context                                                      | Actual findings                                                                      |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Current checkout, backend production dependencies                    | **Zero**                                                                             |
| Unchanged deployed auth-client, actual production virtual-store lock | **Two high / one moderate**: body-parser, Multer and QS remain at their old versions |
| Current checkout's remaining development tooling                     | **Four moderate / one low**                                                          |

The deployed image omits root build manifests. An initial root-path metadata lookup fails;
the successful audit instead uses its actual `/app/node_modules/.pnpm/lock.yaml` and service
manifest, read into the private task directory without an install or container modification.
That production audit returns the original three advisories:
[body-parser](https://github.com/advisories/GHSA-27r3-jxmh-p828),
[Multer](https://github.com/advisories/GHSA-q7qp-rjg7-q26m) and
[QS](https://github.com/advisories/GHSA-6pq8-jhm2-2vcw).
Its nonzero exit and unresolved deployed production findings are retained explicitly.
No exploitation test is performed against existing services.

The current checkout's full audit still reports **four moderate and one low** in unchanged
development tooling: `glob`
10.5.0/13.0.6 ([GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4)),
`minimatch` 9.0.9/10.2.6 ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249))
and `deepmerge` 4.3.1 ([GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)).
The full checkout audit's nonzero exit is retained. These development findings are recorded
separately from the deployed production findings and are neither waived nor fixed in task
9.5. No dependency or lockfile changes occur.

Task 9.5 remains unchecked until the canonical commit is remotely fetchable, the concrete
private operator binding is approved/available and its real browser journey is verified at
that binding, with honest availability and the required owner review. The current passing
temporary journey cannot substitute for those missing acceptance conditions. Do not archive.
