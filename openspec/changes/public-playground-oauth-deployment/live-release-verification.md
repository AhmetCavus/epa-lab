# Live release verification

2026-11-16, `/srv/yappai/hosting/epa-lab`.

The owner explicitly approved the reviewed [release packet](release-packet.md) for tasks
6.1 and 6.2, including bounded Keycloak maintenance, public experimental beta activation
and the documented targeted withdrawal/recovery on any acceptance failure. This supersedes
the earlier preparation-only authorization. Identity/key/session/token discontinuity is
already accepted. No database reset, H2 migration, volume deletion, HAPI data/configuration
change or unrelated-service replacement is authorized. The change must not be archived.

The attempt ended **withdrawn/recovered, 14/16 complete**. Tasks 6.1/6.2 are approved but
remain unchecked: fresh private acceptance did not complete and public activation was
never attempted. The owner explicitly required withdrawal/recovery on an acceptance failure;
the release was not resumed after recovery. The corrected verification input is ready for
review, not evidence that either release task passed.

The beta uses owner-provisioned individual demo accounts and synthetic-only data. Supported
production startup/storage and passing checks are not a production-readiness claim.

## Verified preflight

- All six reviewed current/candidate/recovery image identities are present. Saved fixture
  and original-provider image archives, configuration manifests and private binding hashes
  verify. Ten protected configuration files match preparation.
- Existing PostgreSQL is healthy and answers SQL. The prepared fresh schema has 101 tables
  owned by `keycloak_app`, no excessive role privileges/memberships and no active candidate
  connections. No PostgreSQL restart or DDL was performed during this release attempt.
- Actual ingress peers match the packet: Traefik `172.18.0.20`, cloudflared `172.18.0.6`.
  Current public HTTPS is reachable with normal TLS validation.
- Original administrator recovery credentials were verified privately. The private,
  public and application-withdrawal models render; the public peer placeholder was never
  applied to a live service. State for all 49 existing containers was captured.

## Handoff and stopped acceptance

Maintenance began at `2026-11-16T15:24:36.232033+00:00`. The original provider logged its
transaction-recovery shutdown and **"Keycloak stopped in 1.073s"**. It exited 143 after
SIGTERM, with no OOM or runtime error. A helper initially expected exit 0; inspection of
the actual shutdown evidence corrected that helper assumption without changing Keycloak.

The existing `keycloak` service then started the reviewed immutable 26.8.2 image in
production mode on the prepared PostgreSQL database. Health passed; the sole mount was
the read-only versioned JSON. The original H2 volume existed with **no attached container**.
Only the necessary private BFF/HAPI containers were recreated for fresh credentials and
cache reset; their existing images and HAPI datasource inputs were preserved.

Fresh private administrator authentication and reading `epa-demo` passed. The next
verification step failed with **`Invalid public setting: PLAYGROUND_APP_ORIGIN`**. The
private acceptance helper incorrectly passed the private app origin into the public-realm
settings validator. This was an agent verification-input error, **not evidence of a
Keycloak defect**. The helper now explicitly uses the fixed public origin for that validator,
and its corrected settings construction passes locally. No application or provider policy
was weakened. Fresh private protocol/browser acceptance, old-authentication checks and
actual public acceptance were not completed; prior staged results do not substitute.

## Reviewed recovery executed

The release stopped at the private verification failure. Public SPA/BFF/provider routing
was never activated. The saved project route was restored, the saved fixture image was
recreated with the reviewed safe withdrawal configuration, and the fresh provider was
cleanly stopped. The existing Keycloak service was returned to the saved original 26.8.0
image/settings and original H2 volume. Only affected private BFF/HAPI containers were
recreated with matching original credentials/trust inputs.

Recovery completed at `2026-11-16T15:27:47.350538+00:00`. The original H2 volume is now
**reattached to the recovered original private provider**, as allowed by the approved
recovery procedure; it is no longer offline. The fresh PostgreSQL database/schema/users/keys
remain retained separately, without an active provider connection. Neither store was
merged, imported, reset or deleted. No volume was deleted.

Actual recovery acceptance passes:

- Original private administrator access and **27 private standard/ePA-PAR protocol checks**.
- Real browser `/login` → Keycloak → `/callback` → authenticated `/session`, with tokens
  held by the BFF; the existing **six-test real ePA integration suite** also passes.
- Live HAPI synthetic read: **200** with permission, **403** without permission, **401**
  without authentication. HAPI data/configuration/credentials/permissions are preserved.
- Actual public HTTPS fixture/Catalog/conceptual ePA returns 200. Public OAuth login,
  session, provider discovery and synthetic late callback return **404**, with no TLS bypass.
- All 60 HAPI table counts/content fingerprints match before/after the attempt and after
  recovery acceptance. PostgreSQL and unrelated services retain their original identities,
  images, start times and mounts; ten protected configuration hashes still match.

Sanitized machine evidence is in [live-release-results.json](live-release-results.json).
Private operator scripts, models, credentials and diagnostics remain in the 0700 directory
`.local-backups/public-playground-oauth-deployment/20261116-live-release-4aqf2djv`;
credential/diagnostic files are 0600 and excluded from Git. No real credentials or protocol
tokens are included in the retained report.

## Remaining concrete gate

Complete the fresh-provider private acceptance with the corrected helper before any public
activation, then run the full actual public HTTPS acceptance. This attempt supplies no
public beta acceptance. Tasks 6.1/6.2 remain unchecked; the change is not archived.
