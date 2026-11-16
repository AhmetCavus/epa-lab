# Task 9.5 — Consolidated private deployment plan

**Date:** 2026-11-13. **Decision:** owner-approved for the exact private deployment packet.
The owner explicitly approved this plan and authorized its execution, targeted container
recreation, backups, verification and rollback on 2026-11-13. This approval is recorded
before implementation/deployment in this turn. Public routing/deployment, unrelated features
and dependency changes remain excluded. Approval is authorization, not acceptance evidence;
task 9.5 stays unchecked at **49/50** until every required check passes.

## Git reproducibility blocker resolved

A new, clean recursive checkout from the configured GitHub remotes succeeds:

```bash
git clone --recurse-submodules --no-local https://github.com/AhmetCavus/epa-lab.git /tmp/epa-001-task95-plan-20261113/fresh
```

| Verification                                         | Result                                                                                  |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Parent remote / checkout                             | `https://github.com/AhmetCavus/epa-lab.git`, `3a034d9fd6095b191e6b72e821f42e1d89c96d94` |
| HAPI remote                                          | `https://github.com/AhmetCavus/hapi-fhir-jpaserver-secured-starter`                     |
| Remote feature branch / recursively checked-out HAPI | `e65bafc279f02f44b19b47ca7326015886047a63`                                              |
| Parent and nested working trees                      | Clean                                                                                   |
| Local URL substitution / object alternates           | None                                                                                    |

The prior [failed remote fetch](private-runtime-verification.md#blocker-1--canonical-hapi-commit-is-not-on-its-configured-remote)
remains historical evidence. Its Git blocker is now **resolved**, without a push or a
submodule-pointer change by this task. No build or persistent browser acceptance from this
new checkout is claimed.

## Inspected topology and selected binding

| Existing component | Current state                                                                                     | Proposed treatment                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Public Playground  | Healthy static Nginx; `dev-proxy` network                                                         | Preserve container/image/routing and fixture-only behavior                                                       |
| auth-client        | Healthy; host network, `192.168.178.131:3000`; standard profile disabled; old transitive packages | Roll out the already verified patched image; keep this listener and all legacy ePA settings                      |
| Keycloak           | Healthy existing `epa-demo` realm; private issuer `192.168.178.131:5555`                          | Update only `playground-oidc`'s exact callback field; no container restart, realm import or secret/policy change |
| HAPI               | `192.168.178.131:8083`, `epa-lab_default`; repeated startup failure from empty JWKS URI           | Apply the trusted URI and reviewed image; deliberately initialize only the fixed fictional fixture               |
| PostgreSQL         | Healthy, unpublished; existing `epa-lab_res-server-data` volume                                   | Reuse unchanged; no reset/recreation                                                                             |

Port **5173 is unused**. The single recommended entry is
**`http://192.168.178.131:5173/missions`**, reachable on the private LAN/VPN. The browser
must also reach the unchanged private Keycloak issuer. This plan adds no public domain,
DNS, TLS, Traefik or public Nginx route.

Run a persistent private instance of the **existing SPA's Vite binding** on that port.
It proxies only `/api/oauth` to the existing BFF on port 3000, preserving Host/Origin and
redirect responses. The browser returns to the same port-5173 Workspace after Keycloak.
Legacy ePA `/login`, `/callback`, `/session` and PAR endpoints stay on port 3000. There is
no second BFF, Resource Server implementation, gateway or authentication framework.

The new frontend container uses `restart: unless-stopped`; it remains available after the
verification process exits and after Docker restarts. Sessions/runs still have the accepted
bounded process-local lifetime and are lost when the BFF restarts; this adds no durable
session storage. Manage this optional private entry with its targeted Compose commands,
not a shared-stack `down` or an unrelated Yoster/public deployment operation.

## Exact proposed changes

### 1. Existing SPA Dockerfile: one optional private target

Insert this target immediately **before** the existing final `FROM nginx:alpine AS runtime`
in `apps/playground/Dockerfile`. The existing builder, pinned npm installation, React source,
public build and final Nginx target remain unchanged. Default/public builds still select
Nginx and compile execution off.

```dockerfile
FROM builder AS private-runtime
RUN chown -R node:node /app
USER node
EXPOSE 5173
CMD ["npm", "run", "dev:private", "--", "--host", "0.0.0.0", "--port", "5173"]
```

This reuses the existing Node/frontend dependencies, private Vite configuration and safe
logger. Binding to all interfaces is confined to the container; Docker publishes only the
specified private host address. No root `.env`, client secret or token is copied into this
frontend image or supplied to its process.

### 2. Optional private Compose overlay

Add `infrastructure/docker-compose.private.yml`, used with the existing host manifest:

```yaml
services:
  res-server:
    mem_limit: 4g
    environment:
      PLAYGROUND_DEMO_SEED: 'true'
      JAVA_TOOL_OPTIONS: '-Xms128m -Xmx2g'
  playground-private:
    profiles: ['private-runtime']
    image: epa-lab/playground-private:001-20261113
    container_name: epa-lab-playground-private
    build:
      context: ../apps/playground
      dockerfile: Dockerfile
      target: private-runtime
    init: true
    restart: unless-stopped
    mem_limit: 1g
    ports:
      - '192.168.178.131:5173:5173'
    environment:
      PLAYGROUND_PRIVATE_ORIGIN: http://192.168.178.131:5173
      PLAYGROUND_BFF_TARGET: http://192.168.178.131:3000
    depends_on:
      auth-client:
        condition: service_healthy
    labels:
      traefik.enable: 'false'
    healthcheck:
      test:
        [
          'CMD',
          'node',
          '-e',
          'fetch("http://127.0.0.1:5173/missions", {signal: AbortSignal.timeout(5000)}).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))',
        ]
      interval: 10s
      timeout: 6s
      start_period: 15s
      retries: 12
```

The frontend uses the existing backend `default` network and does **not** join `dev-proxy`.
Existing Keycloak, database and public Playground services are not recreated. Base/public
manifests, hosting registration and routing files need no changes.

The host currently has about 3.8 GiB available RAM and its 8 GiB swap is full. Reuse the
verified integration profile's 4 GiB HAPI limit / 2 GiB maximum Java heap, with a 1 GiB
private frontend limit. Build/start sequentially and monitor readiness; do not stop unrelated
services or relax health/security checks to make the rollout fit.

**Explicit database effect requiring approval:** the existing HAPI internal DAO initializer
may create exactly fictional R4 **`Basic/playground-demo`** in the retained private database.
It has no patient/clinical content or anonymous seed route. The reviewed initializer creates
only when absent, makes no new version for identical content, and fails without overwriting
a conflicting existing resource. This effect is necessary for the fixed read to return
200 instead of 404; it is not hidden inside the JWKS repair. No other resource/data migration,
database recreation or volume reset is proposed. See the [existing seed policy](../../../services/res-server/SECURITY.md#explicit-synthetic-setup).

### 3. Five server-side environment settings

After taking a private mode-0600 backup, update only these fields in the existing root `.env`:

```dotenv
RES_SERVER_JWKS_URI=http://192.168.178.131:5555/realms/epa-demo/protocol/openid-connect/certs
PLAYGROUND_OIDC_ENABLED=true
PLAYGROUND_APP_ORIGIN=http://192.168.178.131:5173
PLAYGROUND_OIDC_REDIRECT_URI=http://192.168.178.131:5173/api/oauth/callback
PLAYGROUND_FHIR_RESOURCE_URL=http://192.168.178.131:8083/fhir/Basic/playground-demo
```

Trusted discovery again confirms the exact JWKS URI and matching issuer/origin. The host
manifest already maps `RES_SERVER_JWKS_URI` into **`FHIR_OIDC_JWKS_URI`**; the missing field
is the precise deployed startup error. A restart alone cannot update a container's environment.
Issuer, audience `playground-fhir`, permission `demo.fhir.read`, JWT/health policies, existing
private-HTTP opt-in, credentials and ePA variables remain unchanged. In particular, ePA's
callback/allowlist remain `http://192.168.178.131:3000/callback`.

### 4. One existing Keycloak client field

In existing realm `epa-demo`, on the existing confidential client `playground-oidc`, replace
only `redirectUris`:

```json
{
  "redirectUris": ["http://192.168.178.131:5173/api/oauth/callback"],
  "webOrigins": []
}
```

The previous sole entry is `http://192.168.178.131:3000/api/oauth/callback`. Resolve the
existing client's UUID and use an authenticated
`PUT /admin/realms/epa-demo/clients/<existing-client-UUID>` with the representation above,
with a private before/after representation and an assertion that only `redirectUris` changes.
`webOrigins: []` explicitly preserves the current value: the pinned
[Keycloak 26.8 source](https://github.com/keycloak/keycloak/blob/26.8.0/server-spi-private/src/main/java/org/keycloak/models/utils/RepresentationToModel.java#L548)
defaults an omitted empty origin collection from redirect URIs. Omitting it could introduce
an unintended origin. Do not send or rotate a client secret in this operation.
Keep the existing client identity, secret, confidential mode, Code flow, S256, empty
`webOrigins`, scopes/audience mappings and policies. No wildcard redirect or CORS expansion.
All ePA client/require-PAR policy, users and realm data are preserved.

**Do not use `keycloak:migrate` to change this existing callback:** inspection confirms its
apply path creates missing resources and verifies existing ones, intentionally rejecting a
different existing callback. Do not weaken that guard or recreate the client/realm. After
the approved single-field update, verify the normal standard definition against the new
configuration; use a new private verification journal if invoking the create-only migration
as a no-op check, since its journal is bound to the callback.

### 5. Exact reviewed image rollout

The following local images are present and match the immutable identities recorded by the
prior builds/tests; the patched BFF identity is also present in its task-9.4 build log:

| Component   | Already verified image                           | Immutable local image identity                                            |
| ----------- | ------------------------------------------------ | ------------------------------------------------------------------------- |
| auth-client | `epa-lab/auth-client:verify-001-task94-20261113` | `sha256:6f36daf27c60c54af72b2299f3ff7008eb9d6b5b03365b8333f6ec75531fb9c9` |
| HAPI fork   | `epa-lab/res-server:verify-001-task6-20261112`   | `sha256:df5b73ca4de42fcdaac3090a2acaa65696a68727372f130e112d1bdaa6e6e5f5` |

Reuse these tested artifacts. Do not overwrite the public Playground image. Retain the old
BFF/HAPI image identities privately before promoting the verified images to the stable
`:local` tags; subsequent ordinary starts must not silently reuse the vulnerable BFF tag.
The reviewed BFF resolves body-parser **2.4.0**, Multer **2.5.0**, QS **6.16.1**, with NestJS
11.2.7/Express 5.2.1 unchanged. No dependency update or upstream HAPI replacement is needed.
If either exact artifact is unavailable or fails inspection, stop for a reviewed source
rebuild/check rather than substituting another image. The fresh remote checkout now supplies
the canonical source for that reproducible build.

## Proposed rollout order — execute only after approval

After approval, implement only the two packaging files above, validate/build the new private
frontend target, and save the private environment/client/image snapshots. Apply the approved
five-field environment and single-field standard-client changes. Recheck both immutable
images, then promote their tags and deliberately recreate **only HAPI and auth-client**.
Start the additional private frontend last. A BFF recreation loses current process-local
transactions/sessions/runs, including legacy demo sessions; users must start fresh logins.

```bash
docker compose --env-file .env -f infrastructure/docker-compose.host.yml -f infrastructure/docker-compose.private.yml --profile private-runtime config --quiet
docker compose --env-file .env -f infrastructure/docker-compose.host.yml -f infrastructure/docker-compose.private.yml --profile private-runtime build playground-private
docker image tag sha256:6f36daf27c60c54af72b2299f3ff7008eb9d6b5b03365b8333f6ec75531fb9c9 epa-lab/auth-client:local
docker image tag sha256:df5b73ca4de42fcdaac3090a2acaa65696a68727372f130e112d1bdaa6e6e5f5 epa-lab/res-server:local
docker compose --env-file .env -f infrastructure/docker-compose.host.yml -f infrastructure/docker-compose.private.yml --profile private-runtime up --no-deps --no-build --pull never -d --wait --wait-timeout 240 res-server
docker compose --env-file .env -f infrastructure/docker-compose.host.yml -f infrastructure/docker-compose.private.yml --profile private-runtime up --no-deps --no-build --pull never -d --wait --wait-timeout 180 auth-client
docker compose --env-file .env -f infrastructure/docker-compose.host.yml -f infrastructure/docker-compose.private.yml --profile private-runtime up --no-deps --no-build --pull never -d --wait --wait-timeout 180 playground-private
```

There is no shared-stack `up`, `down`, Keycloak/database recreation or volume operation.
The public SPA, its image, static Nginx/default build and Traefik routing stay untouched.

## Verification before availability acceptance

Check all three targeted services' health and the actual deployed patched package versions.
Probe HAPI's exact liveness/readiness endpoints (200) and unauthenticated synthetic read
(401). Use real tokens/provider tests for valid read (200), missing permission (403), bad
tokens (401), undeclared operations denied, and unchanged ePA/PAR/legacy sessions.

Use an ordinary private-network browser at **`http://192.168.178.131:5173/missions`**:
start real login without PAR, return to the fixed Workspace, reload the same owned run,
read the synthetic resource, inspect actual BFF/HAPI provenance, sign out and verify old
authentication fails while eligible safe history remains inspectable. Restart the private
frontend and reopen it to demonstrate availability independent of the test runner. A BFF
restart must instead show the accepted fresh-login recovery, without restoring old credentials.

Do **not** treat the existing temporary native-proxy verifier as proof of this deployed URL:
it starts its own BFF/Vite and hard-codes isolated HAPI port 18083. Persistent acceptance
must exercise the actual port-5173 frontend and port-8083 HAPI. Any automated verification
adaptation is limited to that target-specific harness; no authentication/security bypass.
Retain only sanitized outcomes/clean Workspace screenshots, check secret-free APIs/events/logs,
and rerun appropriate ePA/private regressions and strict OpenSpec validation.

Confirm the public fixture browser still offers no authentication/resource action, its
session path remains a static fallback, its deployed Nginx has no OAuth proxy, and its
container/image/routing hashes are unchanged. Runnable availability/owner acceptance and
task 9.5 completion require these **actual persistent-runtime** results. This proposal does
not promote availability or authorize a UI redesign/new OAuth feature.

## Rollback

Stop/remove only `playground-private` using the same two manifests and targeted `stop`/`rm`.
Disable the standard profile and restore the old standard callback field/configuration from
the private snapshot; recreate only auth-client as needed. Keep the **patched** BFF image,
the corrected trusted JWKS value and reviewed HAPI security image. Do not restore the known
vulnerable BFF image or empty JWKS configuration as the normal rollback. Disable the private
seed flag on a later targeted HAPI recreation if withdrawing the mission; leave the approved
fictional resource in place rather than deleting/resetting data. Keep PostgreSQL, Keycloak,
ePA PAR policy, existing data volumes and public fixtures. No volume reset or broad teardown.

## Checks performed for this proposal

The proposed Compose overlay and a temporary Dockerfile draft are held only under
`/tmp/epa-001-task95-plan-20261113/`; repository packaging files and root `.env` are unchanged.
Compose configuration validation passes with a second non-secret settings file. Assertions
confirm the private bind, no public-proxy network, exactly two non-secret frontend settings,
unchanged legacy callback and retained database/volume references. The existing BFF accepts
the proposed profile configuration; Vite resolves the intended private origin/proxy with
Host/Origin preservation, while a static build still compiles execution off. No listener
starts for those checks. An initial local validator probe used the wrong module export;
using the actual `configuration.js` public function resolves that harness lookup without
an application change.

Existing source/verification production audit is clean; the unchanged deployed BFF still has
two high/one moderate findings in the old three transitives. Four moderate/one low
development-tool findings remain separate, as recorded in the
[prior dependency inventory](private-runtime-verification.md#separate-dependency-findings-and-completion-gate).
The planned BFF image rollout addresses deployed production findings; no development
dependency upgrade or waiver is included.

Final proposal checks: root lint/format, frontend formatting and strict OpenSpec pass.
Local documentation validation checks 40 documents / 267 links; command validation covers
67 shell blocks, 116 package-command references and 47 Compose-command references.
The published overlay/private Docker target are compared with the validated temporary drafts.
All 45 original container configurations/images/mounts/networks/ports, image tags and volume
inventories are preserved; the old HAPI's automatic restart cycle remains an explicit
lifecycle exception. Of 264 protected files, 260 remain byte-identical; only the three
active READMEs and task evidence note change, alongside this new plan. Application code,
packaging files, root `.env`, historical reports, public routing, parent HEAD/index and
clean HAPI pointer are unchanged. Keycloak before/after inspection confirms all clients,
policies, users and mappings remain intact, including the old standard callback and empty
web origins. Every task checkbox/description is unchanged.

## Consolidated owner approval recorded

The owner approved this **private-only** packet: the optional SPA packaging/Compose entry on
`192.168.178.131:5173`; five server settings; the standard client's one exact callback-field
change; promotion of the two specified reviewed images; targeted recreation of auth-client
and HAPI; creation of the private frontend; and the guarded creation of only fictional
`Basic/playground-demo` if absent. Include the verification/rollback steps above.

This approval excludes public ingress/routing/deployment, Keycloak/PostgreSQL/public-SPA
container recreation, volume resets, security-policy changes, new dependencies and unrelated
features. The owner requires backups, exact-image verification, actual persistent-browser
acceptance and the targeted rollback if deployment fails. Task 9.5 remains unchecked at
**49/50** until actual acceptance passes; no archive. The original proposed commands and
scope above remain the reviewed execution packet.

## Execution outcome — acceptance blocked and targeted rollback completed

This approved packet was executed on 2026-11-13. Both reviewed backend images and the
private frontend passed process health checks, but the actual persistent browser runtime
failed acceptance. From `epa-lab_default`, requests to the configured host BFF and JWKS
timed out; the private Keycloak peer remained reachable. HAPI consequently rejected the
real test Access Token when trusted-key retrieval timed out. No network/security workaround
was applied.

The required targeted rollback completed after each of two attempts using the same packet.
The private frontend is removed, the standard callback restored and the mission disabled.
Patched backend images and the corrected trusted JWKS remain; seeding is disabled. Existing
Keycloak, PostgreSQL, public fixtures, volumes and routing are preserved. Task 9.5 stays
unchecked at **49/50**, and the change is not archived. See the
[dated deployment and rollback evidence](private-deployment-verification.md) for actual
commands, verification limits and the remaining private-network prerequisite. The reviewed
packet above is retained as history; it is not a claim that the runtime is available.

## Separate firewall-only owner approval — 2026-11-13

After read-only diagnosis confirmed UFW drops, the owner explicitly authorized only the
two reviewed input exceptions on `br-99730318335e`, from `172.24.0.0/16` to
`192.168.178.131`, TCP ports **3000** and **5555**. This authorization includes a complete
UFW backup, rule-order/duplicate inspection, connectivity verification and rollback of
only newly inserted rules if verification fails. It excludes changes to default policies,
Docker networks/containers, public routing and OAuth/JWT configuration. Do not redeploy
the private Playground or mark task 9.5 complete under this authorization.

Approval is recorded before any host-firewall mutation. The
[firewall execution record](firewall-verification.md) preserves the initially blocked
agent preflight and subsequent owner-applied correction. The administrator audit records
the backup and exact two approved insertion commands; read-only checks from the existing
Keycloak container on the affected bridge now connect to both ports and return HTTP 200.
The agent added/removed no rules and redeployed nothing. Current privileged rule ordering,
duplicate counts and root-private backup integrity remain independently unverified.
Task 9.5 remains unchecked at **49/50** pending actual persistent-runtime acceptance;
this firewall-only authorization does not permit private Playground redeployment.

## Owner-authorized deployment resume after firewall correction — 2026-11-13

The owner explicitly authorized resuming **only task 9.5** and the previously approved
private deployment packet after bridge BFF/JWKS connectivity was restored. This supersedes
the firewall-only follow-up's no-redeployment limit for the three named services: existing
patched auth-client, secured canonical HAPI and private Mission Control on port 5173.
Preserve Keycloak/ePA PAR behavior, PostgreSQL/volumes and the public fixture deployment
and routing. No public authentication, unrelated feature, dependency or security-policy
change is authorized. Perform the approved targeted rollback if deployment fails.

This authorization is recorded before renewed deployment. Fresh snapshots and mode-0600
environment/client backups are held under `/tmp/epa-001-task95-resume-20261113/`.
The five reviewed configuration values remain the complete allowed set; trusted JWKS is
already correct, so only four values need changing from the withdrawn state. Both backend
images and the existing private frontend image match their reviewed immutable identities.
Preflight bridge requests to BFF readiness and configured JWKS return 200. Privileged UFW
rule-order/duplicate and root-private backup-integrity inspections remain pending unless
independently verified by an administrator; successful transport does not assert those checks.

Actual acceptance must exercise the deployed frontend and HAPI, normal Keycloak PKCE login,
fixed Workspace return, stable run after reload, protected synthetic read, Inspector
provenance, CSRF logout, old-authentication rejection, retained history, private restart
recovery, public fixture preservation and ePA/PAR regressions. Mark task 9.5 complete only
after these conditions pass, stop there and do not archive.

## Final resumed outcome — persistent private acceptance passed

The [dated acceptance and lifecycle record](private-deployment-acceptance.md) verifies the
actual persistent frontend/BFF/Keycloak/HAPI journey, deployed network connectivity,
real resource authorization, owned observations, CSRF logout, invalidated old authentication,
safe history and frontend/BFF restart recovery. The runtime remains healthy at the approved
private binding after the verifier exits. Required public/ePA regressions and preservation
checks pass. The first resumed verification's provisional-header error and successful
targeted rollback are retained; the corrected full-header verification passes with unchanged
application/security code. Fresh snapshots and durable guarded rollback/reapply helpers
are retained privately. Task **9.5 is complete, 50/50**, with no archive or public deployment.
Privileged firewall-order/duplicate and root-private backup-integrity inspections remain
the independently unverified administrative follow-up explicitly accepted for recording.
