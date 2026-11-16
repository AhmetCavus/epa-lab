# Task 9.5 — Persistent private runtime acceptance

Date: 2026-11-13, Europe/Berlin. **Actual persistent-runtime acceptance passes.**
**Task 9.5 is complete; 50/50 tasks complete. The change is not archived.**
The verified private entry is **http://192.168.178.131:5173/missions**. The existing
private OAuth entry opens the Workspace and its real authentication controls. The three
approved services remain healthy after the verifier exits. The public Playground remains
fixture-only. The change must not be archived under this task.

## Scope, preflight and exact artifacts

The owner explicitly authorized resuming only task 9.5 and the
[reviewed deployment packet](private-deployment-plan.md#owner-authorized-deployment-resume-after-firewall-correction--2026-11-13).
Starting parent was clean `main...origin/main` at
`dcc95ba30eb8976430968caff9ec46cfd6987ba2`; canonical HAPI remained clean at
`e65bafc279f02f44b19b47ca7326015886047a63`. No application, dependency, security-policy,
packaging or public-routing change was needed in this resume.

The [firewall record](firewall-verification.md) was reviewed. Before deployment, requests
from the existing affected bridge to BFF readiness and configured JWKS again returned 200;
port 5173 was unused. **Privileged UFW rule-order, duplicate and root-private backup-integrity
inspection remains pending independent administrator verification.** Transport success is
not represented as proof of those privileged checks. No firewall rule was changed here.

All three image identities were checked before rollout and against the running containers:

| Component      | Image                                            | Immutable identity                                                        |
| -------------- | ------------------------------------------------ | ------------------------------------------------------------------------- |
| auth-client    | `epa-lab/auth-client:verify-001-task94-20261113` | `sha256:6f36daf27c60c54af72b2299f3ff7008eb9d6b5b03365b8333f6ec75531fb9c9` |
| Canonical HAPI | `epa-lab/res-server:verify-001-task6-20261112`   | `sha256:df5b73ca4de42fcdaac3090a2acaa65696a68727372f130e112d1bdaa6e6e5f5` |
| Private SPA    | `epa-lab/playground-private:001-20261113`        | `sha256:bb0bbb9590266f2b98baa93e589048b0b01328119eb14bc0c3ced52644e8944e` |

The public image remains
`sha256:123ab1280bbe09df66dab4fa489d96d43cf122ee744fe5f6b22838b433a0c794`.
Existing reviewed images were reused; no image pull, rebuild, dependency upgrade or fork
substitution was performed. Stable backend tags resolve to the reviewed patched identities.

Fresh pre-deployment environment, full standard-client representation, managed scope IDs,
provider-preservation digest, Dockerfile and image snapshots were saved privately under
`/tmp/epa-001-task95-resume-20261113/backups/`. Snapshot files are mode 0600 and their
directory is 0700. Exact copies and guarded lifecycle helpers are retained durably under
`.local-backups/001-oidc-pkce/task-9.5-20261113-dcc95ba3/`, also directory 0700 / files 0600.
The directory is excluded from Git and the root Docker build context. Credentials and full
client representations are not published as evidence.

Exactly the reviewed five server values are configured. JWKS was already correct; four
values changed from the withdrawn state. Issuer, secrets and all legacy ePA settings are
preserved. Only the standard client's `redirectUris` changed to the exact port-5173
callback; its empty `webOrigins`, identity, secret, scopes, PKCE and other policies remain
unchanged. Provider preservation and standard-definition verification pass afterward.

## Deployment and recovery evidence

Actual validation, promotion and targeted start commands ran from the repository root:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.host.yml -f infrastructure/docker-compose.private.yml --profile private-runtime config --quiet
docker image tag sha256:6f36daf27c60c54af72b2299f3ff7008eb9d6b5b03365b8333f6ec75531fb9c9 epa-lab/auth-client:local
docker image tag sha256:df5b73ca4de42fcdaac3090a2acaa65696a68727372f130e112d1bdaa6e6e5f5 epa-lab/res-server:local
docker compose --env-file .env -f infrastructure/docker-compose.host.yml -f infrastructure/docker-compose.private.yml --profile private-runtime up --no-deps --no-build --pull never -d --wait --wait-timeout 240 res-server
docker compose --env-file .env -f infrastructure/docker-compose.host.yml -f infrastructure/docker-compose.private.yml --profile private-runtime up --no-deps --no-build --pull never -d --wait --wait-timeout 180 auth-client
docker compose --env-file .env -f infrastructure/docker-compose.host.yml -f infrastructure/docker-compose.private.yml --profile private-runtime up --no-deps --no-build --pull never -d --wait --wait-timeout 180 playground-private
```

The guarded task-private `deploy.mjs` checked the backups/current state and performed the
four-field environment delta and one-field Keycloak update before these starts. All three
services became healthy. HAPI retains the approved 4 GiB limit / 2 GiB maximum heap; the
non-root private frontend has a 1 GiB limit and `restart: unless-stopped`. Its only host
publication is `192.168.178.131:5173`, it joins only `epa-lab_default`, has no credentials
in its environment and disables Traefik discovery. No Keycloak/PostgreSQL/public-SPA
container was recreated; no shared-stack `up`/`down` or volume operation was used.

The first browser verifier in this resume passed real login, reload, resource read,
Inspector, frontend restart and local logout, then incorrectly failed its header assertion.
Playwright's `headers()` supplies provisional headers and omitted Origin. A credential-free
diagnostic against a non-mutating health route established that `allHeaders()` contains the
correct Origin; the custom CSRF header was present in both views. Application logout had
succeeded under its unchanged exact-Origin/CSRF checks.

The prepared targeted rollback nevertheless completed: private frontend removed, standard
callback restored, mission/seeding disabled, reviewed patched backends and trusted JWKS
retained. The verifier was corrected to await full headers while retaining exact Origin and
CSRF assertions. The same approved packet was then deployed again; the complete final
journey passes. No application/security change was made to satisfy verification. The first
attempt and successful rollback remain under the private task directory's `attempt1/`.

## Requirement-to-test evidence

The ordinary Chromium browser used the actual deployed URL, port-3000 BFF and port-8083
HAPI. It started no temporary BFF/Vite and used no browser proxy or callback rewrite.

| Required condition                        | Actual passing evidence                                                                                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start authentication from Mission Control | Private catalog entry opened the existing Workspace; Start performed top-level login navigation                                                                           |
| Real Keycloak Code + PKCE without PAR     | Normal provider login; direct authorization URL had `response_type=code`, S256 and no `request_uri`; direct real-provider verifier recorded zero standard PAR requests    |
| Fixed callback return                     | Actual callback HTTP 303 returned to the exact Workspace with no query                                                                                                    |
| Reload restores the current run           | Same run/event IDs after reload; restoration repeated no authorization or resource operation                                                                              |
| Synthetic FHIR read                       | Actual BFF resource request returned 200 for `Basic/playground-demo`; HAPI reported `allowed/demo-read-allowed`                                                           |
| Truthful Inspector                        | Selected actual response displayed `auth-client`, the exact recorded timestamp and a separate `res-server` report; no provider-internal observations were invented        |
| CSRF local logout                         | Actual POST carried exact Origin and context CSRF through the full header view; UI and session became anonymous                                                           |
| Old authentication invalid                | Explicit pre-logout cookie replay could not authenticate and its resource request returned 401                                                                            |
| Eligible history                          | Replacement viewing context retained 14 complete owned events, including the subsequent local rejection; that rejection had no HAPI target or fabricated upstream request |
| Frontend restart                          | Actual container restart preserved BFF authentication, run and event IDs without repeating protocol work                                                                  |
| BFF restart/recovery                      | Actual container restart invalidated old authentication, resource returned 401 and a fresh real login succeeded; local logout then cleaned up                             |
| Browser ownership                         | A second browser's request for the first run returned 404                                                                                                                 |
| Public fixture boundary                   | Actual public browser check passed German/English fixture OAuth and conceptual ePA; zero forbidden requests/errors, no authentication offered or attempted                |
| Existing ePA/PAR                          | Six real Keycloak/legacy browser-demo integration tests passed; direct HAPI verifier performed the existing ePA PAR exchange and rejected its unsuitable token            |

The final persistent-browser result is `verified: true`, with temporary fictional identity
removal and original realm/users/client-policy preservation verified. Browser storage
contained only the explicit locale preference; JavaScript-visible cookies were empty.
Session/event DTO validation, safe surfaces, browser console and deployed-service log checks
pass with the actual generated sensitive values held only in verifier memory.

The approved packet preserves the existing private integration-test entry/labels and
fixture/Planned catalog presentation. This acceptance verifies that entry's persistent
private execution; it does not change public catalog availability or redesign the UI.
Source UI, artwork, layout and protocol presentation remain unchanged.

### Actual deployed network and Resource Server

After browser/restart verification, the deployed frontend itself (`172.24.0.5`) returned
200 from BFF readiness and the configured JWKS endpoint. A temporary read-only Node helper
joined the **actual HAPI container's network namespace** (`172.24.0.4`) and passed the
same TCP/HTTP checks, then was automatically removed. It had no host mounts, published
ports, credentials or added capabilities. This namespace check is explicitly distinguished
from the application evidence: the new HAPI process itself successfully served the real
Keycloak Access Token read, using its unchanged configured trust policy.

The actual deployed HAPI verifier passes **107 assertions**, three real Code exchanges,
zero standard PAR requests and one ePA PAR request. It verifies valid-token read 200,
missing/malformed/ID/ePA tokens 401, missing permission 403, undeclared FHIR/alternate
operations denied, independent data-free health and sensitive-log absence. Both renewed
HAPI starts returned synthetic resource version **1**, with the same retained database;
guarded initialization did not create an additional version. No other resource was seeded,
no real patient data was used, and all temporary test users were removed.

GET/HEAD liveness and readiness return 200 with status-only/empty bodies. Anonymous
`Basic/playground-demo` remains 401. The deployed public Nginx matches the unchanged source,
contains no OAuth proxy and its `/api/oauth/session` returns the same static HTML fallback
as `/missions`, without cookies. Existing public container/image/routing hashes are preserved.

### Exact verification entry points and artifacts

```bash
node --env-file=.env /tmp/epa-001-task95-resume-20261113/verify-deployed-hapi.mjs
node /tmp/epa-001-task95-resume-20261113/verify-persistent-browser.mjs
corepack pnpm --filter @epa-auth-lab/authorization test:integration --testPathPatterns=keycloak.integration.ts
PLAYGROUND_VERIFY_PUBLIC_FIXTURES=true node tests/verify-public-fixtures.mjs
node /tmp/epa-001-task95-resume-20261113/verify-final-provider.mjs
node /tmp/epa-001-task95-resume-20261113/verify-public-and-health.mjs
```

The public browser command ran from `apps/playground`; the others ran from the repository
root. Safe task artifacts include `persistent-browser.json`, `deployed-hapi.log`,
`deployed-network-connectivity.json`, `runtime-preservation.json`, `provider-final.json`,
`public-and-health.json`, regression/public logs and `deployed-identities.json`.
Clean Workspace screenshots were inspected and are under
`apps/playground/.cache/private-deployment-resume/real/` for authorized read, signed-out
history and restart recovery. No provider password screen, raw callback or token is retained.

## Reproducible checkout, lifecycle and rollback

A new recursive GitHub checkout in the private task directory resolves exactly parent
`dcc95ba30eb8976430968caff9ec46cfd6987ba2` and HAPI
`e65bafc279f02f44b19b47ca7326015886047a63`, both clean, without URL substitution or
object alternates. All **172 non-Markdown tracked files** match the active checkout.
The prior remote Git blocker remains resolved. Repeat against a new empty destination:

```bash
git clone --recurse-submodules --no-local https://github.com/AhmetCavus/epa-lab.git /tmp/epa-001-task95-resume-20261113/fresh
git -C /tmp/epa-001-task95-resume-20261113/fresh checkout --detach dcc95ba30eb8976430968caff9ec46cfd6987ba2
git -C /tmp/epa-001-task95-resume-20261113/fresh submodule update --init --recursive
```

On this verified host, retain the existing private `.env`, Keycloak realm/client and
PostgreSQL volume. Check exact image identities and use the targeted start commands above
from the original server checkout. Do not use a fresh checkout's shared-stack lifecycle
to replace running services. No secret values are supplied through frontend variables.

For an ordinary pause/restart of only the private frontend:

```bash
docker compose --env-file .env -f infrastructure/docker-compose.host.yml -f infrastructure/docker-compose.private.yml --profile private-runtime stop --timeout 15 playground-private
docker compose --env-file .env -f infrastructure/docker-compose.host.yml -f infrastructure/docker-compose.private.yml --profile private-runtime start playground-private
```

For complete withdrawal, use the retained guarded rollback helper from the server:

```bash
node /srv/yappai/hosting/epa-lab/.local-backups/001-oidc-pkce/task-9.5-20261113-dcc95ba3/rollback.mjs
```

It stops/removes only the private frontend, disables the standard profile, restores the
old standard callback/configuration, disables seeding and recreates only the two backend
services as needed. It retains the patched images, corrected trusted JWKS, approved fictional
resource, existing databases/volumes and public routes. It never restores the vulnerable
image or blank trust setting. Its reviewed sequence was exercised successfully in this resume.

To reapply the same packet from that exact withdrawn state, the companion guarded helper
checks the retained baseline, exact images and limited deltas before applying them:

```bash
node /srv/yappai/hosting/epa-lab/.local-backups/001-oidc-pkce/task-9.5-20261113-dcc95ba3/deploy.mjs
```

Both durable helpers passed syntax validation. The final accepted runtime was left running;
the durable copies were not executed just to retest shutdown after acceptance. Do not use
`compose down`, reset volumes, recreate Keycloak/PostgreSQL/public services, change public
ingress or broaden firewall/security policy as part of this lifecycle.

## Preservation, dependency findings and completion gate

There are **46 containers**: all **43 unrelated original containers** retain identity,
image, creation/start times, configuration hashes, restart counts, mounts, networks and
bindings; only the two approved backends were replaced and the private frontend added.
Docker network/volume inventories and Keycloak users/ePA PAR policy remain unchanged.
The complete standard client differs only in its approved callback. `.env` differs only
in the four required values from the five-field approved set; trusted JWKS was already set.
Temporary test helpers/users are gone. No commit, stage, push or HAPI pointer change occurred.

The production lockfile/package graph copied from the actual deployed BFF audits with
**zero advisories**. Existing patched body-parser 2.4.0, Multer 2.5.0 and QS 6.16.1 remain;
NestJS stays 11.2.7. The previously documented four moderate and one low **development-only**
findings remain separate in the [dependency inventory](private-runtime-verification.md#separate-dependency-findings-and-completion-gate).
No dependency upgrade, suppression or waiver was added.

Root lint/format, strict OpenSpec, documentation links/commands and all five applicable
Compose configurations validate. Documentation verification checks **43 documents / 293
local links**, **81 shell blocks**, **116 package-command references** and **62 Compose-command
references**, with no issues. Of **268 protected files**, **261 remain byte-identical**;
the only differences are the approved environment and six documentation/status files.
The disclosure scan passes for changed/source distribution
files, safe result/log files and all five relevant deployed service logs; the complete
browser verifier additionally checked its actual generated secrets, cookies and anti-CSRF
values without printing them. Protected rollback backups are excluded from published
evidence. Removed-container logs cannot be fully rescanned; the complete final live run
passes its own disclosure checks. Historical failed runs are not relabeled as passing.

Only approved environment and documentation/status changes remain in the repository;
application, security, frontend assets, build files, public routing, parent HEAD/index and
the clean canonical HAPI pointer are preserved. Only task 9.5's checkbox changes; all
existing task IDs/descriptions and prior completed checkboxes remain intact.
Privileged firewall inspection remains the explicitly recorded administrative follow-up;
it is not claimed complete. No persistent-runtime acceptance blocker remains. Task 9.5 is
complete at **50/50**, and no public authentication or archive is authorized.
