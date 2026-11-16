# Public OAuth candidate — owner review packet

**Current deployment, 2026-11-16:** the owner-approved replacement is live at
<https://auth-playground.yappai.de>. Private and actual public HTTPS technical acceptance
pass; Yoster and root scripts use the permanent live host profile with private `.env.live`.
Task 6.1 is complete; 6.2 awaits only the owner acceptance record. See
[current execution evidence](live-release-verification.md) and
[sanitized results](live-release-results.json) for current immutable image identities.
The packet below is the dated preparation snapshot; its earlier approval gates and image
index IDs are historical. Explicit overlay/recovery commands use the shared base file;
ordinary live lifecycle uses `docker-compose.host.yml`.

Preparation packet updated 2026-11-16. **Do not execute live rollout from this packet yet.**
Tasks 6.1/6.2 remain unapproved. The production candidate has passed; live handoff and
actual public acceptance remain open. Keep the existing fixture release running.

**2026-11-16 fresh-install preparation verified — live release remains unapproved.**
The owner resumed 5.3–5.5 and accepted recreated users, regenerated signing keys, invalidated
sessions and incompatibility of old tokens/credentials. No H2 migration is required.
The owner subsequently approved the targeted PostgreSQL restart and then the exact fresh
database/role/schema addition. Those operations are complete; live Keycloak replacement
and public activation remain excluded. Tasks 6.1/6.2 stay unapproved. The
[current verification and recovery evidence](fresh-keycloak-preparation.md)
supersede the obsolete migration/backup prerequisites in the earlier
[provider report](keycloak-production-verification.md).

**Approved recovery completed:** after the owner approved the exact proposed restart and
read-only postchecks, `epa-lab-res-server-db` restarted successfully at
`2026-11-16T14:05:04.778145385Z`. Container ID/image/configuration/data volume are preserved.
Private TCP/SQL pass on PostgreSQL **16.15**; the existing `hapi` database has 60 public
tables and HAPI has ten JDBC connections from its unchanged container. Current non-reserved
connection headroom at preflight was 86 slots. The approved fresh `keycloak` database,
`keycloak_app` role and schema are now provisioned. Password login/own-schema DDL pass;
effective HAPI data privileges are zero and its catalog fingerprint is unchanged.

**Fresh provider verified:** immutable 26.8.2 production startup on the existing PostgreSQL
16 instance, versioned realms/users, restart persistence, 27 public + 27 private standard
protocol checks, the six-test real ePA/BFF integration suite and the full staged HTTPS
mission/proxy/accessibility/withdrawal suite pass. See [sanitized results](fresh-keycloak-results.json).
The fresh schema has 101 tables owned by the least-privilege role, no unexpected public
tables and no active candidate connections after cleanup. No extra PostgreSQL service or
H2 state transfer was used. All temporary verifier containers are removed.

Tasks **5.3–5.5 are complete, 14/16 overall**; final strict/configuration/preservation
checks pass. Only the unapproved live release/acceptance tasks 6.1/6.2 remain. Original H2 remains
preserved on unchanged live Keycloak and becomes offline only at the separately approved
provider handoff. Actual live provider/public acceptance is not implied by staged success.

Source at resumed preparation: `d0117d8cb5f7402ada97c803bbb21d2361950116`; the current
preparation files are working-tree changes. The base-plus-patch reproduction instructions
below describe only the dated 2026-11-14 application candidate. Existing SPA/BFF candidate
identities were rechecked and match. Their previous acceptance does not verify this fresh
PostgreSQL-backed provider; the separate new verification above does. No new recursive-checkout
or production-readiness claim is made. Experimental beta, synthetic-only data and
owner-provisioned individual demo accounts remain the release boundary.

## Exact candidate and saved release

| Component                                | Local image identity                                                                                |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Production SPA/Nginx                     | `sha256:00ebed371cafcf4aef6947bcc3f23201dce8571ace6dce97b63a0005d65c1bd4`                           |
| BFF                                      | `sha256:213618efa90f9f91dfbaa35c736f9de3aa299278a95e7da32eeb47c453a3c302`                           |
| Existing secured HAPI                    | `sha256:ba8049c9074f35f931af8878dd6eda71b728c37bc143bfdaac81a172446a4927`                           |
| Saved fixture SPA                        | `sha256:6226f17b300586fae1ea71149cb94c30d1bc0c231e99872b46c77d4b1277fa25`                           |
| Prepared 26.8.2 provider (`linux/amd64`) | `quay.io/keycloak/keycloak@sha256:4da21f9a53bcbac1026a0d654b740a81e98e5de4c45457076acc74b4d94b1551` |

Candidate tags are `epa-lab/playground:public-candidate-20261114` and
`epa-lab/auth-client:public-candidate-20261114`. Use immutable identities, `--no-build`
and `--pull never` for reviewed activation; tags alone do not identify a release.
The HAPI source remains canonical commit `e65bafc279f02f44b19b47ca7326015886047a63`.
No extra PostgreSQL instance/volume or application dependency is introduced. Fresh database
`keycloak`, role `keycloak_app` and its schema are created and verified on the existing
PostgreSQL 16 instance under the owner's separate approval; no HAPI privilege/data change
occurred.

The new provider is pinned in
[`docker-compose.keycloak-postgres.yml`](../../../infrastructure/docker-compose.keycloak-postgres.yml).
Registry index is `sha256:c68e286cacd87b942ac1939a0a1481461109d6acd3a57dc496969a319a76bbf0`;
the selected platform manifest above was actually pulled. A no-network/read-only ephemeral
container reports `Keycloak 26.8.2`; subsequent real PostgreSQL startup/restart and fresh
ePA/PAR/OAuth/browser acceptance pass. The immutable image is not deployed to live Keycloak.

The rollback backup is
`.local-backups/public-playground-oauth-deployment/20261114-preparation-n1qza3g3`.
It contains the original fixture image archive/configuration, project route and private
previous binding settings; its manifest verifies the configuration copies. Keep it 0700
with 0600 files. It is intentionally excluded from Git and contains server-held settings.

## Reviewed changes

| Service / file        | Change                                                                                                                                                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `playground`          | Explicit `public-runtime` production target, static Nginx; join existing backend bridge alongside `dev-proxy`, with backend egress priority. No published host port or Vite.                                                                                                    |
| `auth-client`         | Candidate image; enable the standard public profile, exact public issuer/origin/callback and finite actual Nginx peer. Keep all legacy `OIDC_*` settings.                                                                                                                       |
| `keycloak`            | Existing service, pinned 26.8.2 production mode and fresh PostgreSQL database. Versioned `epa-demo` and `playground-public`, fresh synthetic users/keys. Preserve issuer/PAR contracts and verified public authority/proxy controls; no old identity continuity or H2 transfer. |
| `res-server-db`       | Existing instance/image/volume/configuration retained. The targeted one-container restart and fresh Keycloak DDL each received specific approval and are complete; HAPI database/data/credentials/permissions remain unchanged.                                                 |
| `res-server`          | Existing secured image; change only public issuer/JWKS and disallow private HTTP for those trust URLs. No datasource/security-code/data change.                                                                                                                                 |
| Project Traefik route | `infrastructure/traefik/epa-lab-public.yml.template`, rendered with the verified cloudflared address. Restrict this hostname to that Tunnel peer and canonicalize forwarding headers. No shared entrypoint/Tunnel restructuring.                                                |

Fixed public bindings:

- Origin: `https://auth-playground.yappai.de`.
- Issuer: `https://auth-playground.yappai.de/realms/playground-public`.
- Callback: `https://auth-playground.yappai.de/api/oauth/callback`.
- Workspace: `/missions/oauth-oidc/workspace` (clean 303).
- Client: confidential `playground-oidc`, Code/S256 without PAR.
- Access Token: audience `playground-fhir`, optional permission `demo.fhir.read`, <=300 seconds.
- HAPI URL stays the existing private `Basic/playground-demo` resource URL.

Use `infrastructure/docker-compose.public.yml` and the prepared
`infrastructure/docker-compose.keycloak-postgres.yml` with the host file only for approved
activation after fresh-provider acceptance. A private candidate environment supplies `PUBLIC_PLAYGROUND_IMAGE`,
`PUBLIC_AUTH_CLIENT_IMAGE`, `PUBLIC_HAPI_IMAGE`, `PUBLIC_TRAEFIK_ADDRESS`,
`PUBLIC_NGINX_BACKEND_ADDRESS`. A separate restricted `/secure/keycloak-postgres.env`
supplies the actual fresh database/admin/ePA/private-standard/public-standard credential
and callback bindings to both activation and application-withdrawal models. Its prepared
source is `.local-backups/public-playground-oauth-deployment/20261116-fresh-keycloak-cegvpvg4/fresh-provider-bindings.env`
(0600). It includes `KEYCLOAK_DB_PASSWORD` and `PUBLIC_OIDC_CLIENT_SECRET`, with distinct
private-standard and public-standard secrets. Never use the synthetic configuration-check
file or print values. The first three image inputs are the
identities above. Current observed ingress peers are Traefik `172.18.0.20` and cloudflared
`172.18.0.6`; recheck them. Resolve the candidate's actual address on `epa-lab_default`
after its creation. Do not trust a subnet, stale IP or caller forwarding chain.

Provision realm/accounts only through private administration using the exact commands in
[public-realm.md](../../../infrastructure/keycloak/public-realm.md). Use a separate 0600
realm environment file so the fresh public secret/callback cannot overwrite the existing
private standard import settings. The public realm secret and `PUBLIC_OIDC_CLIENT_SECRET`
must match. Individual synthetic aliases and temporary passwords are delivered privately;
registration is disabled and first-login password change is required. The fresh ePA realm
uses only the versioned JSON and protected server inputs, never an H2 dump. New keys/users,
lost sessions and incompatible old tokens/credentials are explicitly owner-accepted.

The fresh provider master administrator is `isolated-admin`; its credential is in the
restricted handoff bundle. Fresh ePA user `demo-versicherte` uses that bundle's
`TEST_USER_PASSWORD`; this is not the old H2 password. Each synthetic public verifier
account has distinct current credentials in its protected run directory. Before granting
a person demo access, select/provision their individual synthetic account and deliver
credentials privately; publish no shared password.

The staged legacy/private-standard callbacks were reconciled to the declared private
bindings from the existing environment. The deployed global hostname remains the reviewed
legacy LAN authority; public realm frontend authority stays the fixed HTTPS origin. The
private test listener/CA and loopback proxy peers are never deployment settings. Rendering
both public and withdrawal models with the actual new credential bundle verifies matching
database/admin/ePA/private-standard/public-standard credentials without changing live files.

Nginx permits only the six declared BFF operations and required public-realm login/OIDC/
theme paths. It rejects unknown/encoded paths, wrong methods, other realms, admin, FHIR,
direct/untrusted peers and non-HTTPS edge authentication. Cookies remain host-only Secure,
HttpOnly, Lax. Logout retains exact Origin and context-CSRF validation; the SPA POST uses
an origin-only referrer policy. API/provider responses are no-store and logs omit raw URLs,
queries, cookies, bodies and exceptions. Final bounded budgets are in
[preparation-verification.md](preparation-verification.md).

## Reproduce the dated application candidate

The 2026-11-14 SPA/BFF candidate was built from the reviewed working tree on base commit
`0e950c7490e4db845dbdc1477a10f0bc454550cb`. Those application changes are now committed in
the current checkout. The commands below apply the saved patch only to a separate recursive
checkout of that old base; do not apply it to the current tree. The backup manifest records
the patch hash. This reproduces dated application evidence, not the fresh PostgreSQL provider.

```sh
git apply --check /srv/yappai/hosting/epa-lab/.local-backups/public-playground-oauth-deployment/20261114-preparation-n1qza3g3/reviewed-source.patch
git apply /srv/yappai/hosting/epa-lab/.local-backups/public-playground-oauth-deployment/20261114-preparation-n1qza3g3/reviewed-source.patch
corepack pnpm install --frozen-lockfile
npm --prefix apps/playground ci --no-audit --no-fund
corepack pnpm typecheck
corepack pnpm build
corepack pnpm test
node --test infrastructure/keycloak/public-realm.test.mjs infrastructure/keycloak/standard-client.test.mjs
docker build -f services/auth-client/Dockerfile -t epa-lab/auth-client:public-candidate-20261114 .
docker build --target public-runtime -t epa-lab/playground:public-candidate-20261114 apps/playground
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 node infrastructure/verify-public-runtime.mjs
```

The platform override selects the existing Playwright version's compatible Firefox binary
on this Ubuntu 26.04 host. Install that test binary with the same override if absent; it
does not change application dependencies. The HTTPS verifier trusts a generated CA only
inside temporary clients/profiles. It creates owned, loopback-only existing-service test
instances, uses HAPI's existing ephemeral H2 support and cleans up its own containers/network.
That dated default mode changes no live `.env`, users, database, deployment or system
certificate store. The separately approved PostgreSQL verification on 2026-11-16 uses the
new Keycloak database and leaves original H2 users/HAPI/live deployments unchanged; its
exact command and private inputs are in [current evidence](fresh-keycloak-preparation.md).

Builds are preparation commands. Do not run the deployment commands below until the exact
packet is approved and all activation gates close. Preserve the current local images;
fresh builds can have different identities, which require re-verification and packet updates.

## Activation gates

1. **PREPARATION PASSED:** approved restart restored actual PostgreSQL/HAPI connectivity;
   approved fresh database/role/schema provisioning, password login and least-privilege/
   HAPI-isolation checks pass with original HAPI data/configuration intact.
2. **CANDIDATE PASSED; live handoff unapproved:** production 26.8.2 PostgreSQL realm/account
   provisioning, repeat/conflict/restart, real ePA/PAR/OAuth/resource/browser and proxy
   negatives pass. The live provider remains its original 26.8.0/H2 installation.
3. **ACCEPTED decision, handoff pending:** owner accepts identity/key/session/token/credential
   discontinuity. Staged session/old-auth/cache boundaries pass; retain the original H2 offline
   with its recovery image/settings during a separately approved provider handoff.
4. Verify actual Tunnel HTTPS/client headers and real discovery/JWKS access from the
   deployed BFF/HAPI, including Cloudflare policy/cache behavior. The owner-confirmed
   working site is not treated as an outage because of the historical isolated 403.
5. Obtain separate task 6.1 release approval for the exact images/configuration, then
   perform task 6.2 public HTTPS acceptance. Loopback evidence does not close that task.

Pending privileged UFW ordering/duplicate/backup-integrity inspection remains an explicit
operational follow-up, not a repeated broad preparation gate. Historical development-only
dependency/host findings remain recorded separately; they are not declared remediated here.

## Targeted activation and withdrawal procedure (not executed live)

These live application commands remain unapproved. Recovery/DDL and isolated fresh-provider
verification are complete; they do not authorize handoff. The provider handoff must preserve
the original H2 volume offline and verify
private ePA/PAR/OAuth before public activation. Include the PostgreSQL provider overlay
in both application activation and withdrawal models; application withdrawal must not
silently restore development-mode/H2 startup. Returning to the original private H2 provider
is a distinct approved recovery operation, without data transfer or shared-volume reset.

1. Verify image IDs, backup hashes and reviewed fresh-client/issuer/credential bindings. Render the candidate
   project route to a private review file; retain the watched original route. Prepare
   the private public/realm environment files. Run only `config --quiet` first:

   ```sh
   docker compose --env-file .env --env-file /secure/public-runtime.env \
     --env-file /secure/keycloak-postgres.env \
     -f infrastructure/docker-compose.base.yml -f infrastructure/docker-compose.public.yml \
     -f infrastructure/docker-compose.keycloak-postgres.yml \
     config --quiet
   ```

2. **Only in the separately approved maintenance window**, confirm PostgreSQL is healthy,
   recheck the original-provider recovery hashes and private fresh-client bindings, then
   cleanly stop only the original Keycloak. Record the stop and retain
   `epa-auth-lab_keycloak-data` offline without deletion or copying. Render the private
   fresh-provider model first, then target the existing service:

   ```sh
   docker compose --env-file .env --env-file /secure/keycloak-postgres.env \
     -f infrastructure/docker-compose.base.yml \
     -f infrastructure/docker-compose.keycloak-postgres.yml config --quiet
   # Only after specific handoff approval and a clean original-provider stop:
   # same model ... up -d --no-deps --no-build --pull never keycloak
   ```

   Confirm 26.8.2 production/PostgreSQL startup, its sole versioned import mount and the
   original H2 volume's detachment. Both freshly provisioned realms already exist in the
   new database; reconcile only their reviewed versioned settings through private
   administration. Never import H2 state. With the same private model and fresh bundle,
   recreate only the affected `auth-client res-server` to load matching new credentials
   and clear old transactions/JWKS caches; their existing images and all HAPI datasource
   inputs remain fixed. Verify fresh private ePA/PAR and standard OAuth before public
   binding changes. Stop for targeted recovery if these fail; public fixtures stay served.

3. Provision/deliver only owner-selected synthetic accounts through private administration.
   Using the reviewed public model from step 1, target `playground` with
   `up -d --no-deps --no-build --pull never playground`. Resolve its backend address:

   ```sh
   docker inspect --format '{{(index .NetworkSettings.Networks "epa-lab_default").IPAddress}}' epa-lab-playground
   ```

   Put that verified exact IP in the private candidate file; revalidate the merged model.
   Target only `auth-client res-server` with the same `up` options. Apply only the reviewed
   Keycloak proxy settings using the prepared PostgreSQL production model, after the
   separately approved handoff and private verification in step 2. Install only the
   rendered project route. This activation window must fail closed until the binding is ready.

4. Verify actual public login/Code-S256/no-PAR/303/refresh/resource/Inspector/CSRF logout/
   old-auth/history, HTTPS and direct/spoofed/path/method/rate/cache/disclosure negatives,
   and private ePA/PAR. Stop and withdraw on failure; no shared-stack shutdown is needed.

5. Withdrawal uses the saved fixture image plus
   `infrastructure/docker-compose.public-rollback.yml`. Its mounted safe-log configuration
   closes API/provider routes, including late callbacks, while restoring fixture navigation.
   Restore the saved project route and private standard/HAPI settings from the protected
   backup, preserving all legacy `OIDC_*` and datasource values. Recreate only affected
   application containers with `--no-deps --no-build --pull never`; restart clears the
   process-local BFF credentials/transactions. Restore unnecessary Keycloak proxy settings
   through the approved PostgreSQL model. Keep the separate original H2 volume offline;
   never attach it to the patched provider or merge its legacy identity state.

   ```sh
   docker compose --env-file .env --env-file /secure/previous-bindings.env \
     --env-file /secure/keycloak-postgres.env \
     -f infrastructure/docker-compose.base.yml -f infrastructure/docker-compose.public-rollback.yml \
     -f infrastructure/docker-compose.keycloak-postgres.yml \
     config --quiet
   # Only after reviewed withdrawal approval, target playground/auth-client/res-server:
   # ... up -d --no-deps --no-build --pull never playground auth-client res-server
   ```

   `previous-bindings.env` has been prepared privately in the backup directory and validated against the saved actual bindings; it includes
   `PUBLIC_FIXTURE_IMAGE` and restored image/standard/HAPI values. Compare the rendered
   model with the backup before recreation. Keep owned public accounts/configuration;
   disable its client through private administration rather than deleting data. Verify
   fixture Catalog/conceptual ePA and private ePA/PAR, with no public OAuth/provider API.

## Original-provider recovery, separate from application withdrawal

Protected recovery assets are under
`.local-backups/public-playground-oauth-deployment/20261116-fresh-keycloak-cegvpvg4/original-provider`:
original provider environment/binding inputs, an image-only Compose override and
`original-keycloak-image.tar` (**265,416,192 bytes**, SHA-256
`0cec7e10d2fa64cc6785c94c010f8cdbe30a21441001beb5c083a15272857977`). All ten OCI blobs
verify; files are 0600 inside a 0700 directory. The current host model plus the saved
original environment/image override validates as the original 26.8.0 `start-dev`/H2 model.
This is an image/configuration backup, **not** a hot H2 data copy. The original H2 volume
was not copied, stopped, exported or imported.

During approved handoff, cleanly stop/detach and retain `epa-auth-lab_keycloak-data` until
acceptance. Application withdrawal keeps the PostgreSQL provider and fresh credentials;
it does not use the saved original credentials. A distinct explicitly approved original-
provider recovery must first close public authentication/restore fixtures, stop the fresh
provider, and retain its PostgreSQL state. Recheck saved hashes; load the archived image
only if needed, then validate the original private provider model:

```sh
docker compose --env-file .env \
  --env-file /secure/original-provider/original-provider.env \
  -f infrastructure/docker-compose.base.yml \
  -f /secure/original-provider/original-image.json \
  config --quiet
```

Only after specific recovery approval, target the existing `keycloak` service using that
model with `up -d --no-deps --no-build --pull never keycloak`; omit the PostgreSQL provider
overlay. Restore matching old private BFF/HAPI bindings/credentials and restart only affected
applications to clear in-memory credentials/JWKS caches, then verify private ePA/PAR. Never
merge the identity stores, serve them concurrently under the live authority, drop the fresh
database, restore shared PostgreSQL/HAPI volumes, or silently reuse newly issued tokens.
Account for the reviewed credential/key/token discontinuity before any return. No such
recovery or live cutover was executed during preparation.

The staged verifier rehearses the same targeted Compose SPA recreation/withdrawal against
owned temporary containers. It does not operate the live stack, restore a database or reset
a volume. Actual public activation/recovery remains subject to the gates above.
