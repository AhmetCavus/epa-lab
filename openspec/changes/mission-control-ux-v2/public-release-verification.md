# Mission Control V2 live release verification

2026-11-17, `yappai-server`, `/srv/yappai/hosting/epa-lab`.

The owner explicitly approved **“Yes, deploy SPA and BFF now”**, including the two image
pins, only the existing `auth-client` and `playground` containers, actual public interface
verification and targeted recovery on failure. The approved release is complete; both
containers are healthy and the public site serves the new bundle.

Open [Mission Control](https://auth-playground.yappai.de/missions/oauth-oidc/workspace).
The root URL continues to open the preserved mission catalog. Existing browser tabs need
a page reload to load the new bundle; BFF sessions were invalidated by its restart.

## Exact running release

| Service | Immutable image |
| --- | --- |
| `epa-lab-playground` | `sha256:63a47c160089c20a7cf0927c51a38811618e187d1189475214972296d08a2aa7` |
| `epa-lab-auth-client` | `sha256:2fa9fc60dba79a2f1e6846087da00c6cf87e1a0fd6e7bee045624e76d91f6e4c` |

Only `PUBLIC_PLAYGROUND_IMAGE` and `PUBLIC_AUTH_CLIENT_IMAGE` in private `.env.live`
changed. The existing `infrastructure/docker-compose.host.yml` and Yoster profile resolve
these exact images, with live builds disabled. The BFF was updated and checked first; the
SPA followed using `--no-deps --no-build --pull never --wait` on each named service.
No new application service, public hostname or route was added.

The public document's `/assets/index-g9PoBYQW.js` and `/assets/index-BMP3XB5O.css`
match the files inside the running new container. Firefox actually rendered the new
`.mission-control`, Explore/Inspect navigation and three-stage layout; this is not inferred
from a healthy container or a changed environment file alone.

## Actual public checks

[Sanitized release results](evidence/07-live-release-results.json) record:

- Private BFF readiness, actual public session and provider discovery return 200. The
  selected anonymous resource request returns the new version-2 BFF 401 rejection.
- The actual root catalog's mission link opens the new Explore workspace. Anonymous
  Resource Explorer is disabled; view/mode/locale navigation makes zero execution calls.
- Real browser navigation reaches the existing Keycloak login form using Code/S256,
  without PAR, a client secret or verifier in the browser URL. No username/password was
  entered, and no existing account or credential was modified.
- Returning to the workspace restores the owned pending run. Missing-CSRF logout returns
  403; the actual cancel action succeeds. Its four real BFF observations are available in
  Inspect and recorded Flow, with original order/provenance and no invented login/resource success.
- Secure/HttpOnly/Lax credential-cookie attributes, no JavaScript protocol persistence,
  no credential disclosure in the learning surface/console and zero preliminary resource reads.
- Four actual Firefox axe scans pass: DE/EN at 1366/390px, reduced motion, no page horizontal
  overflow and no execution from presentation controls.
- Actual administration, legacy realm, direct FHIR and resource-catalog paths return 404;
  wrong API methods return 405. No public boundary was widened.

Review captures: [Explore](evidence/07-public-explore.png),
[Inspect with real events](evidence/07-public-inspect-recorded.png),
[recorded Flow](evidence/07-public-flow-recorded.png),
[Resource Explorer requiring login](evidence/07-public-resource-login-required.png).

The authenticated login → selected HAPI 200 → logout journey was previously verified with
these exact immutable images in the [isolated final acceptance](evidence/06-final-https-results.json).
It was **not repeated with the owner's live account**: this rollout preserved existing
passwords/accounts and its live acceptance used anonymous and owned pending/cancelled states.
Successful authenticated live resource use remains an owner review check. No production-readiness
or certification claim is made; the deployment remains an experimental synthetic-only beta.

## Preservation and recovery

All **48 untargeted containers** retain their pre-release IDs, images, mounts and start times.
All **12 protected files**, including `.env`, `.env.live-demo`, Compose, routes and manifest,
retain their hashes; `.env.live` differs only in the two authorized image values and remains
0600. Keycloak, HAPI, PostgreSQL and the private Playground were not restarted. HAPI source
is clean; the original H2 volume exists and is attached to no container. No database object,
data, account, privilege or volume was reset/deleted.

An initial Python HTTP probe received public 403 responses although the BFF was healthy.
The previous images were recovered **before SPA cutover**. Node HTTPS and actual Firefox
checks then passed; the final deployment followed without changing any security policy.
That failed probe is not counted as acceptance evidence.

The exact prior images and private environment backup remain in ignored 0700 operator
storage at `.local-backups/mission-control-ux-v2/public-release-zti0xel0`; credential-bearing
files are 0600. A bounded `deploy.py rollback` there restores only the prior two image pins
and the same two application services, retaining all other settings. The working branch
and prior reports remain available; no OpenSpec change was archived and no Git commit was
created by this deployment.
