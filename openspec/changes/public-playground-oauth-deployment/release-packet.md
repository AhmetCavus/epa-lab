# Public OAuth candidate — owner review packet

Preparation only, 2026-11-14. **Do not execute live rollout from this packet yet.**
Tasks 6.1/6.2 remain unapproved. The production-provider gate below is open;
staged success is not public acceptance. Keep the existing fixture release running.

**2026-11-16 refresh — preparation blocked, not a release approval.** The owner authorized
only tasks 5.3–5.5. [Current prerequisite evidence](keycloak-production-verification.md)
records unavailable shared PostgreSQL (missing Docker task and refused private TCP), no
verified consistent Keycloak backup in the inspected saved artifacts, pending specific
DDL/maintenance/session decisions and a pinned-provider security finding. No provider
recovery, database provisioning, live pause, new production rehearsal or deployment ran.
The provider gate remains open; tasks 5.3–5.5 and 6.1/6.2 remain unchecked.

The preparation source is now committed at `77e65d54524253b84e46f422c9854021517d4f06`;
the preceding planning revision and this execution record are local changes. The old
base-plus-patch reproduction instructions below describe the dated 2026-11-14 run, not
the procedure to apply to the current commit. SPA/BFF candidate identities and all seven
recorded backup hashes were rechecked and match. The saved SPA rollback/configuration
backup is not a Keycloak state backup. No fresh production-provider/recovery acceptance
or recursive-checkout reproduction is claimed in this refresh.

## Exact candidate and saved release

| Component             | Local image identity                                                      |
| --------------------- | ------------------------------------------------------------------------- |
| Production SPA/Nginx  | `sha256:00ebed371cafcf4aef6947bcc3f23201dce8571ace6dce97b63a0005d65c1bd4` |
| BFF                   | `sha256:213618efa90f9f91dfbaa35c736f9de3aa299278a95e7da32eeb47c453a3c302` |
| Existing secured HAPI | `sha256:ba8049c9074f35f931af8878dd6eda71b728c37bc143bfdaac81a172446a4927` |
| Saved fixture SPA     | `sha256:6226f17b300586fae1ea71149cb94c30d1bc0c231e99872b46c77d4b1277fa25` |

Candidate tags are `epa-lab/playground:public-candidate-20261114` and
`epa-lab/auth-client:public-candidate-20261114`. Use immutable identities, `--no-build`
and `--pull never` for reviewed activation; tags alone do not identify a release.
The HAPI source remains canonical commit `e65bafc279f02f44b19b47ca7326015886047a63`.
No new PostgreSQL container, role, database, volume or application dependency is included.

The rollback backup is
`.local-backups/public-playground-oauth-deployment/20261114-preparation-n1qza3g3`.
It contains the original fixture image archive/configuration, project route and private
previous binding settings; its manifest verifies the configuration copies. Keep it 0700
with 0600 files. It is intentionally excluded from Git and contains server-held settings.

## Reviewed changes

| Service / file        | Change                                                                                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `playground`          | Explicit `public-runtime` production target, static Nginx; join existing backend bridge alongside `dev-proxy`, with backend egress priority. No published host port or Vite.                                                                |
| `auth-client`         | Candidate image; enable the standard public profile, exact public issuer/origin/callback and finite actual Nginx peer. Keep all legacy `OIDC_*` settings.                                                                                   |
| `keycloak`            | Owned `playground-public` realm/client/accounts; realm frontend URL fixes the public authority. Trust forwarding headers only from the actual Nginx backend address. Keep global legacy hostname, users, signing keys and ePA/PAR policies. |
| `res-server`          | Existing secured image; change only public issuer/JWKS and disallow private HTTP for those trust URLs. No datasource/security-code/data change.                                                                                             |
| Project Traefik route | `infrastructure/traefik/epa-lab-public.yml.template`, rendered with the verified cloudflared address. Restrict this hostname to that Tunnel peer and canonicalize forwarding headers. No shared entrypoint/Tunnel restructuring.            |

Fixed public bindings:

- Origin: `https://auth-playground.yappai.de`.
- Issuer: `https://auth-playground.yappai.de/realms/playground-public`.
- Callback: `https://auth-playground.yappai.de/api/oauth/callback`.
- Workspace: `/missions/oauth-oidc/workspace` (clean 303).
- Client: confidential `playground-oidc`, Code/S256 without PAR.
- Access Token: audience `playground-fhir`, optional permission `demo.fhir.read`, <=300 seconds.
- HAPI URL stays the existing private `Basic/playground-demo` resource URL.

Use `infrastructure/docker-compose.public.yml` with the host file only for approved
activation. A private candidate environment supplies `PUBLIC_PLAYGROUND_IMAGE`,
`PUBLIC_AUTH_CLIENT_IMAGE`, `PUBLIC_HAPI_IMAGE`, `PUBLIC_TRAEFIK_ADDRESS`,
`PUBLIC_NGINX_BACKEND_ADDRESS` and `PUBLIC_OIDC_CLIENT_SECRET`. The first three are the
identities above. Current observed ingress peers are Traefik `172.18.0.20` and cloudflared
`172.18.0.6`; recheck them. Resolve the candidate's actual address on `epa-lab_default`
after its creation. Do not trust a subnet, stale IP or caller forwarding chain.

Provision realm/accounts only through private administration using the exact commands in
[public-realm.md](../../../infrastructure/keycloak/public-realm.md). Use a separate 0600
realm environment file so the fresh public secret/callback cannot overwrite the existing
private standard import settings. The public realm secret and `PUBLIC_OIDC_CLIENT_SECRET`
must match. Individual synthetic aliases and temporary passwords are delivered privately;
registration is disabled and first-login password change is required.

Nginx permits only the six declared BFF operations and required public-realm login/OIDC/
theme paths. It rejects unknown/encoded paths, wrong methods, other realms, admin, FHIR,
direct/untrusted peers and non-HTTPS edge authentication. Cookies remain host-only Secure,
HttpOnly, Lax. Logout retains exact Origin and context-CSRF validation; the SPA POST uses
an origin-only referrer policy. API/provider responses are no-store and logs omit raw URLs,
queries, cookies, bodies and exceptions. Final bounded budgets are in
[preparation-verification.md](preparation-verification.md).

## Reproduce preparation

The candidate was built from the reviewed working tree on base commit `0e950c7490e4db845dbdc1477a10f0bc454550cb`; these source changes have not been committed or pushed. Apply the reviewed source patch from the protected backup to a recursive checkout of that base before rebuilding. The backup manifest records the patch hash. With the pinned dependencies and Docker images available:

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
No live `.env`, users, database, deployment or system certificate store is changed.

Builds are preparation commands. Do not run the deployment commands below until the exact
packet is approved and all activation gates close. Preserve the current local images;
fresh builds can have different identities, which require re-verification and packet updates.

## Activation gates

1. **OPEN:** the existing provider configuration still uses `start-dev`/`dev-file`.
   This packet does not authorize a production storage transition or publish that mode
   as suitable. Resolve production suitability separately, preserve legacy ePA, and
   revalidate the merged candidate against that reviewed provider configuration.
2. Verify actual Tunnel HTTPS/client headers and real discovery/JWKS access from the
   deployed BFF/HAPI, including Cloudflare policy/cache behavior. The owner-confirmed
   working site is not treated as an outage because of the historical isolated 403.
3. Obtain separate task 6.1 release approval for the exact images/configuration, then
   perform task 6.2 public HTTPS acceptance. Loopback evidence does not close that task.

Pending privileged UFW ordering/duplicate/backup-integrity inspection remains an explicit
operational follow-up, not a repeated broad preparation gate. Historical development-only
dependency/host findings remain recorded separately; they are not declared remediated here.

## Targeted activation and withdrawal procedure (not executed live)

After the provider gate closes, include its separately reviewed production configuration
in both the activation and rollback Compose models. Do not accidentally recreate a
production provider from the unchanged development-mode base file.

1. Verify image IDs, backup hashes and unchanged legacy settings. Render the candidate
   project route to a private review file; retain the watched original route. Prepare
   the private public/realm environment files. Run only `config --quiet` first:

   ```sh
   docker compose --env-file .env --env-file /secure/public-runtime.env \
     -f infrastructure/docker-compose.host.yml -f infrastructure/docker-compose.public.yml \
     config --quiet
   ```

2. Provision only the owned public realm/accounts, then target `playground` with
   `up -d --no-deps --no-build --pull never playground`. Resolve its backend address:

   ```sh
   docker inspect --format '{{(index .NetworkSettings.Networks "epa-lab_default").IPAddress}}' epa-lab-playground
   ```

   Put that verified exact IP in the private candidate file; revalidate the merged model.
   Target only `auth-client res-server` with the same `up` options. Apply only the reviewed
   Keycloak proxy settings using the approved production-provider model. Install only the
   rendered project route. This activation window must fail closed until the binding is ready.

3. Verify actual public login/Code-S256/no-PAR/303/refresh/resource/Inspector/CSRF logout/
   old-auth/history, HTTPS and direct/spoofed/path/method/rate/cache/disclosure negatives,
   and private ePA/PAR. Stop and withdraw on failure; no shared-stack shutdown is needed.

4. Withdrawal uses the saved fixture image plus
   `infrastructure/docker-compose.public-rollback.yml`. Its mounted safe-log configuration
   closes API/provider routes, including late callbacks, while restoring fixture navigation.
   Restore the saved project route and private standard/HAPI settings from the protected
   backup, preserving all legacy `OIDC_*` and datasource values. Recreate only affected
   application containers with `--no-deps --no-build --pull never`; restart clears the
   process-local BFF credentials/transactions. Restore unnecessary Keycloak proxy settings
   through its approved production model, without changing its data volume or legacy realm.

   ```sh
   docker compose --env-file .env --env-file /secure/previous-bindings.env \
     -f infrastructure/docker-compose.host.yml -f infrastructure/docker-compose.public-rollback.yml \
     config --quiet
   # Only after reviewed withdrawal approval, target playground/auth-client/res-server:
   # ... up -d --no-deps --no-build --pull never playground auth-client res-server
   ```

   `previous-bindings.env` has been prepared privately in the backup directory and validated against the saved actual bindings; it includes
   `PUBLIC_FIXTURE_IMAGE` and restored image/standard/HAPI values. Compare the rendered
   model with the backup before recreation. Keep owned public accounts/configuration;
   disable its client through private administration rather than deleting data. Verify
   fixture Catalog/conceptual ePA and private ePA/PAR, with no public OAuth/provider API.

The staged verifier rehearses the same targeted Compose SPA recreation/withdrawal against
owned temporary containers. It does not operate the live stack, restore a database or reset
a volume. Actual public activation/recovery remains subject to the gates above.
