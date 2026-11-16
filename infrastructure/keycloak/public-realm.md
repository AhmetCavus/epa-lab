# Public realm preparation

This tooling belongs to the approved preparation of
`public-playground-oauth-deployment`. It does not authorize changes to the live provider
or public ingress. The existing provider's production-suitability gate remains open.

The fixed public issuer is `https://auth-playground.yappai.de/realms/playground-public`;
the only mission client is confidential `playground-oidc`, with the exact callback
`https://auth-playground.yappai.de/api/oauth/callback`. The realm frontend URL provides
the public authority without changing the global legacy hostname or `epa-demo`.
Code/S256 requires no PAR. Access Tokens last at most five minutes and carry
`playground-fhir`; the optional scope `demo.fhir.read` controls the synthetic read.

Run the reproducible isolated verification first:

```sh
node --test infrastructure/keycloak/public-realm.test.mjs infrastructure/keycloak/standard-client.test.mjs
node infrastructure/keycloak/verify-public-realm.mjs
```

The second command requires Docker, the pinned local Keycloak image and OpenSSL. It uses
an owned temporary bridge/container, tmpfs and loopback-only HTTP/HTTPS listeners. Its
test certificate is explicitly trusted with normal hostname/chain validation. It never
mounts existing volumes, joins the public proxy network or changes the live realm. Only
the temporary container/network are removed. Private files remain in its reported 0700
temporary directory; remove that directory after retaining the non-sensitive results.
`start-dev` here is a test fixture, not production acceptance.

After separate rollout approval, prepare a private 0600 environment file containing
`KEYCLOAK_ADMIN_URL` (private administration origin), `KEYCLOAK_ADMIN_USERNAME`,
`KEYCLOAK_ADMIN_PASSWORD`, and a fresh `PLAYGROUND_OIDC_CLIENT_SECRET` of at least
32 characters. Public binding fields, if provided, must equal the fixed values above.
Do not reuse the existing private standard client's secret.

```sh
node --env-file=/secure/public-realm.env infrastructure/keycloak/public-realm.mjs apply
node --env-file=/secure/public-realm.env infrastructure/keycloak/public-realm.mjs verify
```

Creation disables registration, reset-password and unused built-in browser clients,
requires SSL and enables brute-force protection. Existing resources are verified only;
conflicts fail rather than being adopted, overwritten or silently rotated. Legacy users,
clients, signing keys and ePA/PAR configuration are not copied or modified.

For each person, privately choose a distinct synthetic alias (`demo-` plus 4–32 lowercase
letters/digits) and a random initial password of at least 16 characters. Add
`PLAYGROUND_DEMO_USERNAME` and `PLAYGROUND_DEMO_INITIAL_PASSWORD` to a separate private
environment file with the same administration settings, then run:

```sh
node --env-file=/secure/individual-demo.env infrastructure/keycloak/public-demo-account.mjs
```

Deliver the alias and initial password directly to that person through the owner's
private credential-delivery channel. Do not publish shared credentials, store them in
the SPA, commit the environment file or include credentials in command-line arguments.
No public registration is provided. Each new account must change its password at first
login. Repeated provisioning never resets an existing password or required actions.
The synthetic profile uses `example.invalid`; the administrator-only ownership marker
cannot be changed through the user profile. Conflicts require owner review.

Withdrawal disables the owned public client/realm through private administration after
the public proxy is withdrawn; retain accounts rather than deleting them. This requires
no database restore, volume reset or change to ePA.
