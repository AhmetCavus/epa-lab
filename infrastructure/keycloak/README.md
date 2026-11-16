# Private Keycloak standard mission registration

The existing `epa-demo` realm contains two independent confidential clients:

| Client                                        | Authorization behavior                                            | Callback                                                     |
| --------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------ |
| `epa-auth-server` (existing `OIDC_CLIENT_ID`) | Required PAR and PKCE S256; existing ePA browser/header contracts | Existing `OIDC_DEFAULT_REDIRECT_URI` (`/callback`)           |
| `playground-oidc`                             | Direct Authorization Code + PKCE S256, without PAR                | Exact `PLAYGROUND_OIDC_REDIRECT_URI` (`/api/oauth/callback`) |

The [auth-client profile internals](../../services/auth-client/README.md) are now verified.
Standard browser routes/sessions, fixture Playground integration and HAPI authorization
remain later tasks; client registration alone does not provide them.
Use this registration only in the existing private lab. Test listeners publish only on
loopback; public routing is unchanged.

## Credentials and claims

Run `npm run env:init` from the repository root. It creates a separate random
`PLAYGROUND_OIDC_CLIENT_SECRET` and retains existing ePA/admin/user/database credentials.
For an existing environment, it also adds the fixed client ID and derives the standard
callback from the existing ePA callback origin. Review the exact private callback before
migration. A different host, path or trailing slash is not an accepted redirect.

The new settings are:

```dotenv
PLAYGROUND_OIDC_CLIENT_ID=playground-oidc
PLAYGROUND_OIDC_CLIENT_SECRET=
PLAYGROUND_OIDC_REDIRECT_URI=http://localhost:3000/api/oauth/callback
```

The blank example secret must be filled by `env:init`; do not paste credentials into command
arguments, source files or frontend variables. Compose supplies the secret/callback only to
Keycloak for fresh import. Auth-client profile settings are documented in its separate guide; mission browser integration is pending.

The standard client has no `require-par` marker, no browser CORS origins, and no implicit,
password, service-account, device, CIBA or standard token-exchange grant enabled. It has no
default identity/profile scopes and does not change any ePA policy.

Its default `playground-fhir-audience` client scope uses an audience mapper for Access Tokens
only: `aud` includes `playground-fhir`. This scope is not emitted as a permission. Its optional
`demo.fhir.read` client scope is emitted in the Access Token's space-delimited `scope` claim
only when requested. The normal request uses `openid demo.fhir.read`. An `openid`-only grant
keeps the resource audience and omits that permission, supporting later resource-denial tests.
ID Tokens retain only the OAuth client audience `playground-oidc`; they are not FHIR credentials.

This follows Keycloak's [default/optional client scopes](https://www.keycloak.org/docs/latest/server_admin/index.html#_client_scopes)
and [audience mapper](https://www.keycloak.org/docs/latest/server_admin/index.html#_audience)
model. This configuration is an exercise permission, not patient access or gematik conformance.

## Fresh local setup

The existing [realm import](epa-demo-realm.json) is the source of truth for both fresh setup
and migration. On a new, empty private lab, initialize the environment and use the existing
startup command:

```bash
npm run env:init
npm run infra:up
```

Keycloak imports both clients and the two standard client scopes on first startup. Existing
realms are skipped by startup import; use the explicit migration below for an existing lab.
Do not delete a realm or reset a volume to apply this configuration. The inherited synthetic
demo identity may require normal profile completion at Keycloak on first login.

## Existing realm migration and rollback

Use Node 24 and administrative credentials already held in the local `.env`. The script
requires an existing `epa-demo` realm and accepts only loopback/private URL inputs. Set
`KEYCLOAK_ADMIN_URL` in the process environment when administration should use a different
local listener from `KEYCLOAK_HOSTNAME`; the advertised issuer stays unchanged.

```bash
npm run env:init
install -d -m 0700 .local-backups/keycloak-standard
npm run keycloak:migrate -- --state-file .local-backups/keycloak-standard/migration.json
npm run keycloak:migrate -- --state-file .local-backups/keycloak-standard/migration.json
```

The first run creates only missing managed scopes and `playground-oidc`. The second run
verifies the same configuration/secret/IDs and returns `unchanged` without writes. Conflicting
names, unowned resources, changed settings, an unexpected secret or a `require-par` marker
fail before mutation. Resolve such conflicts explicitly; migration does not overwrite them
or rotate a secret silently. It does not update realm-wide settings, existing clients, users,
roles or client policies. No running container is replaced or restarted.

The mode-0600 journal records only the target and IDs created by that migration, not secrets.
Keep the same journal across repeat runs. Do not run concurrent migrations. Rollback uses it:

```bash
npm run keycloak:rollback -- --state-file .local-backups/keycloak-standard/migration.json
```

Rollback removes only resources created by that journal, checks their ownership/identity,
and refuses if another client now references a created scope. It preserves resources that
already existed, ePA configuration/users and all volumes. Repeated rollback is a no-op;
use a new journal for a deliberate later reapplication. Drift or interrupted operations
require reviewing the journal and current configuration; they are not a reason for a reset.
The script uses the [Keycloak Admin REST API](https://www.keycloak.org/docs-api/latest/rest-api/index.html).

## Reproduce verification

```bash
npm run keycloak:test
npm run keycloak:verify
```

The first command tests configuration boundaries and fresh/existing environment setup. The
second needs Docker and the already available pinned `quay.io/keycloak/keycloak:26.8.0` image.
It runs fresh-import and pre-existing-ePA scenarios sequentially in disposable containers,
with generated test credentials, available loopback ports, dedicated networks and tmpfs
data. It never mounts an existing Docker volume or joins the public proxy network. Cleanup
stops/removes only the container IDs and network IDs it created, including on test failure.

The isolated synthetic identity is given a complete fictional profile before the tests;
Keycloak's profile/security checks remain enabled. Verification exercises standard no-PAR
login/code exchange, missing/plain/invalid PKCE, wrong/missing verifier and client credentials,
exact redirects, disabled grants, signed audience/permission/ID Token claims, narrower grants,
code replay, ePA PAR bypass rejection and genuine ePA PAR acceptance. It also tests migration
conflict refusal, repeat/no-op preservation, rollback/reference protection and reapplication.
Tokens and transaction credentials stay in verifier memory; only named pass results are printed.

For a configured local realm, the protocol-only verifier can be run directly:

```bash
node --env-file=.env infrastructure/keycloak/verify-standard-client.mjs
```

It uses the synthetic demo identity and `TEST_USER_PASSWORD`; an explicitly provisioned
test identity can be selected with `KEYCLOAK_VERIFICATION_USERNAME`. It intercepts the
provider callback in memory and does not call the unimplemented BFF callback or the SPA.
The verifier checks token signatures/claims without printing token contents.
