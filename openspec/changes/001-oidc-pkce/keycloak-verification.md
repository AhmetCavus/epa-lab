# Tasks 3.1–3.3 — Separate standard Keycloak client

**Date:** 2026-11-12. **Result:** all scoped acceptance checks passed; tasks 3.1–3.3 complete.
Final OpenSpec progress is **18/50**. Stop before task 4.1.

## Baseline and implementation boundary

The checkout began clean on `main`, tracking `origin/main`, at
`d1bbe9110cb4d999fc102de95a6522b0f9f78eb5`. The canonical HAPI submodule stayed clean at
`d609c23ae82cbd4f9cd5da26e09306b24029d131`. OpenSpec reported the existing repository root,
`spec-driven`, `ready`, and 15/50 complete. This session implemented only tasks 3.1–3.3.

The source [realm import](../../../infrastructure/keycloak/epa-demo-realm.json) now adds
`playground-oidc` and its two client scopes in the existing `epa-demo` realm. Removing those
additions from the parsed JSON produces exactly the original realm configuration, including
the ePA client, `require-par` marker/policy, profiles and users. Their identifiers are retained.

The [private Keycloak guide](../../../infrastructure/keycloak/README.md) documents fresh setup,
migration, rollback and verification. The migration is create-only for missing managed
resources and verifies existing ones; it refuses conflicting names/settings/secrets before
mutation. It never imports/recreates a realm, writes existing users/ePA configuration, or
silently rotates credentials. Rollback is restricted to the journal's created resource IDs.

`env:init` added only `PLAYGROUND_OIDC_CLIENT_ID`, `PLAYGROUND_OIDC_CLIENT_SECRET` and
`PLAYGROUND_OIDC_REDIRECT_URI` to the local ignored `.env`. Hash comparisons confirm every
pre-existing value is unchanged. The new secret is separate and generated server-side;
the callback uses the existing application origin, currently
`http://192.168.178.131:3000/api/oauth/callback`. `.env` and the rollback journal use mode 0600;
the journal directory uses 0700. The journal contains no credentials. Compose passes only
the new secret/callback to Keycloak for fresh import; auth-client's existing environment
mapping is unchanged. No container was restarted to apply this registration.

No auth-client standard profile/routes, SPA integration or HAPI authorization was implemented.
The verifier intercepts provider callbacks in memory and never calls the unimplemented BFF
callback. This is Keycloak configuration/protocol evidence, not an application mission or
FHIR authorization result. Historical reports and ADRs are unchanged.

## Task 3.1 — Client and PKCE

- Confidential `playground-oidc`, `client-secret` authentication and one exact private callback.
- Authorization Code enabled; implicit, password/direct access and service accounts disabled;
  device/CIBA/standard token-exchange flags disabled. No browser CORS origins.
- PKCE S256 enforced; missing challenge/method, `plain` and invalid methods reject before login.
- Wrong or absent verifier rejects at exchange with HTTP 400 `invalid_grant` and no tokens.
- Missing or wrong client secret rejects with HTTP 401 `unauthorized_client` and no tokens.
- The standard client has no `require-par` role; ordinary authorization works without PAR.
- Authorization URLs omit secret/verifier; no frontend source/configuration was changed.

## Task 3.2 — Audience and permission

The default `playground-fhir-audience` scope maps custom audience `playground-fhir` into
Access Tokens only. It is not emitted as a permission. Optional scope `demo.fhir.read` is
present in the Access Token's `scope` claim only when requested with `openid`.

Real code exchange succeeds for both `openid demo.fhir.read` and `openid`. The verifier
validates RS256 signatures using Keycloak's JWKS, issuer, lifetime, resource audience,
authorized client and bearer purpose without printing token contents. The narrower grant
retains `playground-fhir` and lacks the resource permission. ID Tokens have only audience
`playground-oidc` and the matching nonce. Both flows reject code replay. No resource-token
acceptance or HAPI permission-enforcement claim follows from these checks.

## Task 3.3 — Fresh setup, migration and preservation

Actual commands from the repository root (Node 24.20.0; pinned Keycloak 26.8.0 image):

```bash
npm run keycloak:test
npm run keycloak:verify
npm run env:init
docker compose --env-file .env -f infrastructure/docker-compose.yml --profile backend config --quiet
docker compose --env-file .env -f infrastructure/docker-compose.host.yml config --quiet
corepack pnpm test:integration
install -d -m 0700 .local-backups/keycloak-standard
KEYCLOAK_ADMIN_URL=http://127.0.0.1:5555 npm run keycloak:migrate -- --state-file .local-backups/keycloak-standard/migration.json
KEYCLOAK_ADMIN_URL=http://127.0.0.1:5555 npm run keycloak:migrate -- --state-file .local-backups/keycloak-standard/migration.json
KEYCLOAK_ADMIN_URL=http://127.0.0.1:5555 node --env-file=.env /tmp/epa-001-keycloak/verify-existing.mjs
corepack pnpm test:integration
```

The focused unit tests passed **3/3**. Their sandboxed first attempt could not spawn Node
(`EPERM`); the same tests passed with the required host execution permission.

The isolated harness passed **27 protocol checks in each of two scenarios (54 total)**:
fresh import and an existing ePA-only realm, with generated credentials and disposable
synthetic identities. Each instance used an available `127.0.0.1` port, a dedicated network
outside `dev-proxy` and tmpfs data, with no existing volume mounted. Both containers and
their networks were removed by the harness. In addition to the protocol checks, it verified:

| Migration check                                                                        | Result                                                                 |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Fresh-import client/scopes match the migration definition                              | Pass; migration creates zero resources                                 |
| Unowned scope-name collision                                                           | Rejected before any client creation                                    |
| Existing-realm first migration                                                         | Exactly one client and two scopes created                              |
| Repeated migration                                                                     | Zero creations/realm writes; managed identities/configuration retained |
| Existing clients/secrets, ePA PAR policy, users/role/group mappings and realm settings | Preservation digests match before/after both migrations                |
| Another client references a newly created scope                                        | Rollback refuses before deletion                                       |
| Scoped rollback, repeated rollback and deliberate reapplication                        | Pass; original realm data retained                                     |
| Standard no-PAR request and ePA bypass attempt                                         | Standard succeeds; ePA rejects bypass                                  |
| Genuine ePA PAR reference                                                              | Accepted and opens the provider login form                             |

The first fresh-flow attempt reached Keycloak `VERIFY_PROFILE`, because the legacy imported
demo identity lacked a complete profile. The harness now fills that disposable identity's
fictional email before taking its preservation baseline; profile/security checks remain
enabled and the tracked legacy user fixture is unchanged. Other verifier corrections handled
Keycloak's actual 401 `unauthorized_client` credential denial and its internal login-form
redirect/cookie behavior. No server security policy was relaxed to satisfy these checks.

The existing private realm was inspected and hashed before mutation. Its first migration
returned `{"created":3,"status":"applied"}`; the second returned
`{"created":0,"status":"unchanged"}`. All existing realm/client/user/policy digests match.
The same **27 protocol checks** then passed on that configured realm using one temporary
fully fictional user, which was removed afterward. Managed client/scope IDs still match
the first migration journal. The six existing real Keycloak/ePA integration tests passed
**before and after migration (6/6 each)**, including the original browser callback/session.
The runtime registration remains installed; rollback was exercised only in isolation.

Token/transaction values stayed in memory. The isolated and live Keycloak routine-log scans
found none of the credentials/codes/verifiers/tokens collected by the verifier. No token
response, raw callback, cookie or identity claim set was printed or added to the repository.

## Validation and preservation

The final audit compares the Docker baseline and confirms all **45 original containers**
retain their IDs, image IDs, creation/start times, mounts, networks and port bindings. The
volume set and original network identities are unchanged; no test container/network remains.
No Compose `down`, volume reset, public route update or existing-container replacement ran.

All **110 protected file hashes** match, covering existing auth-client/UI source, historical
verification/readiness reports, ADRs and hosting/routing files. HAPI HEAD/tree are unchanged.
The fresh-import ePA JSON content is semantically identical after removing the additive
standard registration. Existing environment values and auth-client Compose inputs are retained.

Repository lint/formatting and focused JavaScript lint pass. All four Compose configurations
pass, and the existing auth-client service definition/environment is identical to its prior
resolved configuration. Local documentation checks pass: 164 links/anchors across 24 documents,
23 shell blocks, 64 package-command references and 12 Compose-command references.
`git diff --check` and strict OpenSpec validation pass.
The new root commands use existing Node/Docker tools; no dependency/version/lockfile change
was needed. Only tasks 3.1–3.3 become checked; task 4.1 onward remains unchanged.

Local evidence is under `/tmp/epa-001-keycloak/` (`live-migration.json`, `live-flow-results.json`,
private ePA test logs and preservation summaries) and
`/tmp/epa-keycloak-verification-mySG1E/results.json` (both isolated scenarios). The persistent
rollback journal is `.local-backups/keycloak-standard/migration.json`, excluded from Git.

No remaining blocker for tasks 3.1–3.3. Stop after this scope; application/FHIR integration
and later security acceptance remain pending.
