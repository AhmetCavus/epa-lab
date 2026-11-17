# Live release verification

**Subsequent SPA/BFF update, 2026-11-17:** Mission Control V2 was separately approved and
deployed to the same two application services. Its [current image pins and evidence](../mission-control-ux-v2/public-release-verification.md)
supersede the SPA/BFF identities below. The provider/storage release and preservation report
below remain historical evidence; no Keycloak/HAPI/PostgreSQL changes occurred in this update.

2026-11-16, `/srv/yappai/hosting/epa-lab`.

The public site at <https://auth-playground.yappai.de/missions> now runs the live OAuth/OIDC
mission in place of the fixture deployment. The owner approved tasks 6.1/6.2 and explicitly
instructed replacement of the existing public site. Yoster and root lifecycle commands use
the same live configuration; there is one public playground container and hostname.

Actual HTTPS technical acceptance passes. Task 6.1 is complete. Task 6.2's technical work
is complete; its checkbox remains open only for the owner's acceptance record after trying
the new installation. The change is not archived and makes no production-readiness claim.

## Running configuration

- `infrastructure/docker-compose.host.yml` includes the shared base, public bindings and
  PostgreSQL-backed Keycloak. `yappai.host.json` supplies private `.env.live` (0600).
- The SPA uses immutable image `sha256:1f7ca67c465492385666cd9ce3ab459b2f5faa065af251d4d90e1a6ef0a608c3`;
  the BFF remains reviewed image `sha256:213618efa90f9f91dfbaa35c736f9de3aa299278a95e7da32eeb47c453a3c302`.
  Live Compose build overrides are disabled, including Yoster rebuild requests.
- Keycloak 26.8.2 runs production mode on the previously prepared `keycloak` database and
  least-privilege `keycloak_app` role in the existing PostgreSQL instance. The original H2
  volume is retained offline; no container attaches it.
- Nginx reserves backend IP `172.24.0.6` and re-resolves the provider through Docker DNS
  every five seconds, so provider recreation does not leave its old address cached.
  Existing source/HTTPS trust restrictions remain enforced.
- All five live services are healthy, their configuration hashes match the canonical host
  model, and their Compose ownership labels match Yoster's manifest. Yoster can read the
  protected environment file. A future Start selects the live configuration.

The secured HAPI application payload is unchanged. The old reviewed multi-platform index
and the subsequently rebuilt local index refer to the same `linux/amd64` platform manifest,
`sha256:f15d09f928f2040e0c214b1aa719d4f60ec6b34c636afc90502849ce89ed3466`.
That descriptor, config and root filesystem identities were verified and archived privately;
the live deployment pins this platform manifest. No HAPI source rebuild was performed.

## Actual acceptance

The new SPA/proxy first passed the isolated production-provider runtime suite. After a clean
original-provider shutdown and fresh-provider handoff, private acceptance passed before
public activation:

- 27 standard/ePA-PAR protocol checks and the existing six-test real ePA integration suite.
- Real private browser `/login` → provider → `/callback` 303 → authenticated `/session`.
- Actual HAPI responses 200 with permission, 403 without permission, 401 without a token
  or when an ID Token is supplied.
- Original administrator bearer and refresh rejected; original signing key IDs absent.

The complete actual public HTTPS journey then passed in Firefox with normal TLS validation:

- Catalog **OAuth-Mission starten**, Code + S256 without PAR, first-login password change,
  clean callback 303, workspace reload retaining the run, protected fictional read and safe
  Inspector/events.
- Secure/HttpOnly/Lax credential cookies, CSRF rejection, local logout, rejection of old
  authentication and retention of owned history. No credentials or protocol tokens in
  JavaScript storage or learning observations.
- Independent HAPI denial checks, undeclared paths 404, wrong methods 405, direct Nginx and
  spoofed Traefik requests 403, API no-store, login rate limiting 429 and recovery.
- Four zero-violation accessibility scans: German/English at 1366/390px, reduced motion,
  no viewport overflow and stable run identity when switching language.

An individual synthetic owner account is provisioned. Its initial credentials are in private
`.env.live-demo` (0600, excluded from Git/build contexts); the provider requires a password
change on first login. No shared public password or open registration was added.

## Preservation

All 60 HAPI table counts/content fingerprints match before and after acceptance. The HAPI
datasource and original `.env` are unchanged. PostgreSQL retains its container identity,
image, mounts, start time and configuration; it was not restarted during this replacement.
All 45 untargeted containers are unchanged. No temporary verifier containers remain.
No database was reset, no volume deleted, and no H2 transfer or HAPI privilege/data change
was performed. Intentional deployment changes include the manifest, shared host composition,
public bindings and this project's Traefik route; the previous ten-file preservation claim
does not apply to those owner-authorized edits.

## Earlier failures and corrections

The first release attempt stopped before public activation because its helper supplied a
private app origin to the public settings validator. Original private 26.8.0/H2 and fixtures
were recovered and verified. A subsequent attempt reached public activation but public
discovery returned 401 after provider recreation; original services/fixtures were recovered.
The current Nginx build corrects stale provider DNS resolution.

During final acceptance, a direct-IP probe expected 403 but received 404. Node's `fetch`
ignored the supplied Host header, so the probe did not target the intended Traefik router.
The reviewed application withdrawal was completed while retaining fresh PostgreSQL and
original H2 offline. Historical withdrawal image IDs had become unavailable; the verified
identical HAPI platform and the verified current private BFF supplied the recovery images.
The helper now sends an explicit HTTP Host header. Both exact 403 probes and the complete
public acceptance suite pass after reactivation; no access policy was weakened.

Sanitized results: [live-release-results.json](live-release-results.json). Private scripts,
models, backups and diagnostics remain in versioned 0700 operator directories under
`.local-backups/public-playground-oauth-deployment`; files containing credentials are 0600.
Prior failed evidence is retained separately. Owner acceptance remains the sole open part
of task 6.2; do not archive or delete original H2 without a separate owner decision.
