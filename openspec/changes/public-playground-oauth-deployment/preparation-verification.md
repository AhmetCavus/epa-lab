# Narrowed public runtime preparation

Date: 2026-11-14, Europe/Berlin. Approved scope: tasks 1.1–5.2 only.
Tasks 6.1/6.2 and public activation are excluded. The owner renewed apply after the
2026-11-14 scope revision; no repeated preparation approval is needed.

Historical `repository-verification.md` and all change 001 records remain unchanged.
Their database/privilege/readiness prerequisites are superseded by the current plan.

## Task 1.2 — binding and scope

| Binding                 | Candidate / existing value                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| Public origin           | `https://auth-playground.yappai.de`                                                         |
| Callback / Workspace    | `/api/oauth/callback` / `/missions/oauth-oidc/workspace` (303)                              |
| Standard issuer         | `https://auth-playground.yappai.de/realms/playground-public`                                |
| Standard client / grant | `playground-oidc`, Code/S256 without PAR, audience `playground-fhir`, `demo.fhir.read`      |
| Existing BFF            | Linux host network, `192.168.178.131:3000`                                                  |
| Existing Keycloak       | `172.24.0.2:8080` on `epa-lab_default`; legacy LAN issuer on port 5555 remains              |
| Existing HAPI           | Private `192.168.178.131:8083/fhir/Basic/playground-demo`; no data or implementation change |
| Existing ingress peers  | cloudflared `172.18.0.6`, Traefik `172.18.0.20`, fixture Nginx `172.18.0.4` on `dev-proxy`  |

These are read-only Docker/source observations, not proof of a newly deployed proxy chain.
Only the SPA target, BFF standard/public settings, owned public realm, Nginx/project route
and necessary HAPI issuer/JWKS settings may change in the reviewed candidate. PostgreSQL
services, database roles/ownership/credentials, ePA clients/issuer/users/policies, volumes,
shared ingress and unrelated deployments are excluded.

Current root/product/architecture/UX/hosting pointers now follow this scope. The checked
historical task 1.1 and earlier evidence are retained. Both approved PNG references were
visually inspected; implementation must preserve artwork, layout and existing mission boundaries.

## Activation gates, separate from preparation

- The checked-in provider uses `start-dev`/`dev-file`; production suitability remains open.
  Private isolated verification is not evidence of a production-ready provider. No storage
  transition is performed here; any necessary out-of-scope resolution needs separate review.
- Actual public issuer/discovery/JWKS reachability, canonical HTTPS/proxy handling, cookies,
  CSRF, private admin/FHIR boundaries, request limits and disclosure must pass before activation.
- Real ePA/PAR regressions and targeted fixture rollback are required. One standard BFF
  profile moves from private to public at approved cutover; simultaneous origins are not claimed.

Privileged UFW ordering/duplicate/backup-integrity inspection remains an operational follow-up.
No sudo retry or broad capacity/database review was performed. The isolated historical 403
is not treated as an outage; the owner confirms public/private availability.

## Preservation baseline

Read-only `docker inspect` captured 46 existing containers and seven protected file hashes
in `/tmp/epa-public-20261114-w8g_x7uk/baseline.json` (0700 directory, 0600 file). It contains
no environment secret values. The running public SPA image is
`sha256:6226f17b300586fae1ea71149cb94c30d1bc0c231e99872b46c77d4b1277fa25`;
Keycloak is `sha256:b0f60d489d51c5d113390bdf5461d4c06e6051be026c05549f2e1e10ec352bcc`,
HAPI is `sha256:ba8049c9074f35f931af8878dd6eda71b728c37bc143bfdaac81a172446a4927`.
No live container, network, volume or route was modified during this capture.

## Tasks 2.1–2.2 — isolated real provider

Implemented `infrastructure/keycloak/public-realm.mjs` and `public-demo-account.mjs`,
reusing the existing standard client definition and private administrator API. See
`infrastructure/keycloak/public-realm.md` for exact commands and private credential delivery.
New realms/accounts are owned; repeat runs verify rather than overwrite credentials.
Keycloak 26 drops undeclared user attributes, so fresh creation declares the ownership
marker with administrator-only view/edit permissions while retaining the built-in profile.
An initial test exposed that requirement; the corrected real account tests pass.

Commands executed:

```sh
node --test infrastructure/keycloak/public-realm.test.mjs infrastructure/keycloak/standard-client.test.mjs
node infrastructure/keycloak/verify-public-realm.mjs
```

The initial five unit checks passed (the default sandbox blocked a legacy child-process
test; rerunning with approved execution permissions passed). A sixth synthetic-alias
check was subsequently added and is included in the final quality run.
The final real run passed: `/tmp/epa-public-keycloak-VnHhDm/results.json` (private directory).
It used the exact pinned Keycloak image recorded above, an owned temporary bridge,
tmpfs, loopback publication and a private test TLS certificate with normal chain/hostname
validation. No TLS bypass, existing realm, volume or public proxy network was used.

Results: 27 public HTTPS checks and 27 legacy checks passed. Public discovery/endpoints
use the exact public authority; Code/S256 succeeds without PAR. Missing/invalid challenge,
wrong/missing verifier or client secret, replay, unregistered callback, password and client
credentials grants are rejected. Signed Access Tokens have the required audience, client,
permission and <=300-second lifetime; the narrow scope lacks permission. ID Tokens retain
only the client audience and correct nonce. Token/credential values were not printed.

Fresh/repeated realm and account provisioning, conflicting secret/account rejection without
overwrite, real required first-login password change and repeat after password change pass.
The legacy realm snapshot is unchanged; ePA rejects direct authorization and accepts real
PAR. Provider logs passed the in-memory secret sentinel scan. The temporary container and
network were removed in `finally`; private generated test files remain in the reported directory.

Production-provider suitability remains an **open activation gate**: isolated `start-dev`
is test evidence only. This completed binding work performs no live provider/storage change.

## Task 3.1 — verified in isolation

The optional standard-only issuer and explicit public-runtime/finite-peer settings are
implemented. Legacy issuer fallback is preserved. Focused configuration plus real HTTP
boundary tests: **75/75 passed** using
`corepack pnpm --filter @epa-auth-lab/authorization test --runTestsByPath src/config/configuration.validation.spec.ts test/public-proxy.http.spec.ts`.
They reject untrusted peers/forwarding headers, wrong authority/HTTPS/methods, and invalid
Origin/CSRF, and verify secure host-only cookies. Initial test-only ConfigModule wiring
was corrected to match the existing global configuration. Full backend regressions:
`corepack pnpm test` — **16 suites / 425 tests passed**. Typecheck and build pass.
The complete existing ePA/profile/token negative unit coverage is retained, alongside
the real provider PAR checks above; focused real BFF ePA integration is also included
in the final staged verifier.

The candidate Compose overlay changes only HAPI issuer/JWKS trust settings, keeps HTTPS
required, and leaves all datasource settings and the HAPI submodule unchanged. The actual
secured image `sha256:ba8049c9074f35f931af8878dd6eda71b728c37bc143bfdaac81a172446a4927`
started in an isolated host-loopback container using its existing in-memory H2 support,
synthetic seeding and a temporary trusted test CA. No PostgreSQL container or volume was
created. Real signed public-realm tokens produced **200 with permission, 403 without
permission, 401 for missing tokens and ID Tokens**. HAPI fetched JWKS through the actual
HTTPS Traefik/Nginx test chain with normal Java certificate validation. The BFF also
completed real discovery, token exchange and an authorized read through this chain.

No security-policy, dependency, database or HAPI implementation change was required.
The merged host/public Compose model passed `config --quiet` using the protected live
environment read-only plus a private candidate file containing a synthetic test secret.

## Candidate verification corrections (not live deployment)

- Actual `nginx -t` caught unquoted regex braces; quoting was corrected before runtime tests.
- The initial test certificate was a CA used as a server endpoint. Firefox correctly
  rejected it. The verifier now creates a separate CA and server leaf, trusting the CA
  only in temporary Node/Java/Firefox clients. A credential-free browser test confirmed
  normal TLS validation succeeds; no ignore-certificate option or system trust change is used.
- Real Firefox logout exposed `Origin: null` from `no-referrer` on a same-origin POST.
  A credential-free reproduction confirmed it; the adapter now uses `strict-origin` only
  for the CSRF POST, retaining `no-referrer` for reads. Exact Origin and CSRF checks are
  unchanged. The subsequent real logout returned 200.
- Provider assets exhausted the initially shared API read burst. Provider assets and
  metadata now have separate bounded 120/minute, burst-20 budgets. API reads retain
  120/minute, burst 20; login 6/minute, burst 2; resource 30/minute, burst 5; logout
  60/minute, burst 10. Provider login actions use 12/minute, burst 5 and token requests
  30/minute, burst 5. Every protected location also retains the aggregate 60/second,
  burst-60 cap; connections are bounded to 10/client and 100 total.
- The proxy canonicalizes response cache headers and overwrites forwarding headers only
  after the exact ingress peer checks. Its project route permits only the verified
  cloudflared peer. Authentication also requires the trusted edge's HTTPS scheme,
  preventing plaintext edge traffic from becoming authenticated merely through a forced
  forwarding header. See [Cloudflare's header reference](https://developers.cloudflare.com/fundamentals/reference/http-headers/).
- The direct Traefik negative probe now uses raw HTTP with an explicit Host header,
  exercising the real router rather than a fetch implementation's authority handling.

These intermediate runs passed real login/303/refresh/HAPI read/Inspector/local logout,
old-authentication rejection and retained owned history. Remaining proxy/quality/rollback
checks are tracked separately; no incomplete task is claimed complete from these runs.

## Current quality and backup evidence

`node --test infrastructure/keycloak/public-realm.test.mjs infrastructure/keycloak/standard-client.test.mjs`
now passes **6/6**. ESLint and repository Prettier checks pass. Both production audits
(`corepack pnpm audit --prod --json`, SPA `npm audit --omit=dev --json`) report **zero
advisories**; reports are private under the baseline directory.

The first SPA run (`npm test`) passed 88, skipped 2 existing opt-in checks and timed out
in two English desktop accessibility scans. A serial repeat also timed out. A focused
snapshot showed high host load and nearly exhausted swap; causation is not established.
No timeout/assertion was weakened. That checkpoint left the failures open; their final
focused passing results are recorded below.

Rollback backup created at
`.local-backups/public-playground-oauth-deployment/20261114-preparation-n1qza3g3`:
0700 directory, 0600 files, 27,515,392-byte fixture image archive, original fixture Nginx,
host/fixture Compose, watched project route and only previous runtime binding settings.
Copied configuration hashes match the originals. No existing container, role, credential,
volume, firewall rule or watched routing file was changed. Privileged UFW inspection
remains pending as recorded above.

## Final staged acceptance — tasks 3.2–5.2

The final rebuilt candidate passed the complete isolated run:

```sh
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 node infrastructure/verify-public-runtime.mjs
```

Final private results: `/tmp/epa-public-keycloak-iAYfQS/results.json` and
`runtime-results.json`. A non-sensitive copy with quality/preservation results is retained
in [preparation-results.json](preparation-results.json). Exact Docker image identities,
reviewed settings, gates and targeted commands are in [release-packet.md](release-packet.md).
These are Docker image identities returned by `docker image inspect`, not intermediate
build configuration digests. Both candidate images exist locally and were used in this run.

The test chain used the actual production Nginx configuration and pinned Traefik,
Keycloak, BFF and canonical secured HAPI images. Test listeners were loopback-only;
candidate containers used isolated host-loopback bindings, not the live dual-bridge
deployment. Browser traffic crossed a test TLS edge, the real project Traefik route and
Nginx; BFF/HAPI fetched real HTTPS discovery/JWKS with normal TLS validation. The test
edge supplied the genuine-edge role's headers; it did not simulate authentication or
provider-internal protocol decisions. Actual Tunnel/public-network acceptance remains
reserved for tasks 6.1/6.2.

| Requirement / preparation task      | Actual evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Explicit production binding / 3.2   | Production Docker target built; exact-origin/default-off guards tested. Fixture target and private Vite mode retained. No stylesheet/artwork, renderer or domain/event contract changes.                                                                                                                                                                                                                                                                                                   |
| Public realm, demo access / 2.1–2.2 | 27 public + 27 legacy real protocol assertions, fresh/repeat/conflict, required password change, disabled/unprovisioned login rejection, optional permission and <=300-second Access Tokens.                                                                                                                                                                                                                                                                                               |
| Public profile / 3.1                | Final 428 NestJS tests; fixed public authority requires public proxy mode; accidental legacy issuer replacement rejected. Existing profile/token/session/CSRF/race/expiry negatives retained.                                                                                                                                                                                                                                                                                              |
| Protected resource                  | Actual HAPI 200/403/401 decisions for permitted/narrow/missing/ID-token cases; canonical HAPI source unchanged. Reuse [change 001 security evidence](../001-oidc-pkce/resource-server-verification.md) for unchanged HAPI validation/default-deny implementation.                                                                                                                                                                                                                          |
| Browser lifecycle / 5.2             | Mission Control start → Keycloak form → Code/S256 without PAR → clean Workspace 303 → same run after reload → synthetic read → truthful Inspector → CSRF logout → old-cookie 401 → owned safe history.                                                                                                                                                                                                                                                                                     |
| Ownership/cache/disclosure          | Run ID without its browser context returns 404; API no-store; scoped secure cookies; JavaScript storage contains no credentials; sentinel scans of browser/rendered surfaces and actual candidate logs pass.                                                                                                                                                                                                                                                                               |
| Public routing / 4.1                | Unknown/encoded/alternate paths, wrong methods, admin/other realms/ePA/FHIR denied; direct Nginx and spoofed Traefik source rejected; plaintext edge auth rejected; login 429/recovery and independent logout validated; failed-upstream raw callback marker absent from logs.                                                                                                                                                                                                             |
| Existing ePA                        | Six existing real NestJS ePA/PAR integration tests pass against the isolated provider; the legacy realm snapshot is identical after the full run/withdrawal. Mandatory PAR remains enforced.                                                                                                                                                                                                                                                                                               |
| UX/localization                     | DE/EN public runtime at 1366/390px, reduced motion and four WCAG A/AA scans pass; language changes retain the same run. Public screenshots visually inspected against the previously reviewed references: hierarchy, dark language, typography, diagram scrolling, timeline and Inspector preserved.                                                                                                                                                                                       |
| Binding preparation / 4.2           | Public and rollback Compose models validate. Candidate Nginx reaches real BFF/Keycloak; actual HAPI container reaches HTTPS JWKS. Existing persistent/public settings and network reachability are not replaced by this staged proof; final actual edge verification is gated.                                                                                                                                                                                                             |
| Recovery / 4.3                      | Actual targeted Compose recreation of the owned candidate SPA to saved fixture image succeeds; Catalog/conceptual ePA return 200, API/provider routes return 404. Safe-log withdrawal config handles late callbacks. Saved BFF/HAPI identities and prior standard/trust settings match the rendered private rollback model exactly; unchanged private behavior reuses [001 acceptance](../001-oidc-pkce/private-deployment-acceptance.md). No live recreation or DB restore was performed. |

The long combined test exceeded a test administrator token lifetime during an intermediate
closing snapshot. The verifier now reauthenticates its private test control plane before
that snapshot; provider/session/token lifetimes were not extended. The final snapshot and
full combined run pass.

Final focused quality commands/results:

```sh
corepack pnpm test                         # 16 suites / 428 passed
corepack pnpm typecheck
corepack pnpm build
corepack pnpm exec eslint services/auth-client --max-warnings 0
node --test infrastructure/keycloak/public-realm.test.mjs infrastructure/keycloak/standard-client.test.mjs
# From apps/playground:
npm run build
npx --no-install playwright test tests/localization.spec.ts --grep 'en readable layout and accessible states at (1366|1024)px' --workers=1
npx --no-install playwright test tests/oauth-adapter.spec.ts tests/oauth-runtime.spec.ts --workers=1
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 PLAYGROUND_NATIVE_CHROMIUM=/tmp/epa-001-spa/browsers/chromium-1194/chrome-linux/chrome npx --no-install playwright test tests/oauth-visual.spec.ts --grep 'actual Chromium 100% and 200% zoom' --workers=1
```

Provisioning: **6/6**. The two original English accessibility timeouts passed on the final
serial retry at their original 30-second budgets after staging cleanup. Adapter/runtime:
**44/44**. Existing native fixture/private 100%/200% zoom: **2/2**, both locales; the
previous two opt-in skips are closed. All 92 browser cases now have passing results across
the full/focused runs, rather than a claim that the initial failing run passed. New public
copy additionally has the real Firefox desktop/narrow accessibility evidence above.

Final source review added three fail-closed configuration tests (425 → 428): public
authority with false/missing public mode and replacement of the legacy issuer. The final
BFF image containing those checks passed the full real staged journey again. Dependency
manifests/lockfiles and HAPI submodule content/pointer are unchanged. Production advisory
counts remain zero; historical development-only findings are retained in change 001.

Backup integrity: 16 OCI blob digests verified, the saved fixture identity is present,
and the image archive/private rollback environment hashes are in the protected manifest.
The final preservation check found all 46 original container IDs/images/start times,
bindings/networks/mounts and seven protected files unchanged, with zero test containers
remaining. Public fixture routing, `.env`, PostgreSQL and Keycloak volumes remain intact.

The production-provider suitability gate and separately authorized real public acceptance
remain open. Privileged UFW inspection is still pending. No public release, database or
privilege transition, live container recreation, push or archive occurred.

Final completion: **tasks 1.1–5.2 complete, 11/13 overall**. Tasks 6.1/6.2 remain
unchecked and unapproved. Strict OpenSpec validation, root/changed-SPA formatting,
`git diff --check` and 123 local documentation links pass. A final read-only inspection
independently confirmed the actual Keycloak command is `start-dev` and `KC_DB=dev-file`;
the production-provider activation gate is therefore still open, not merely inferred from
the checked-in Compose file. All original containers/protected files still match the baseline.

Reproducibility: a fresh local recursive checkout of base commit
`0e950c7490e4db845dbdc1477a10f0bc454550cb` plus the protected reviewed source patch
reproduces all 53 changed/new files byte-for-byte and resolves HAPI to canonical `e65bafc`.
The backup manifest records the patch hash and checkout path. This uses the existing local
HAPI Git object store; remote availability evidence is reused from change 001. The new
public source remains uncommitted/unpushed, as stated in the release packet.
