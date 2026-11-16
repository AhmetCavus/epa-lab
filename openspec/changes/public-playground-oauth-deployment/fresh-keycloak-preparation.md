# Fresh PostgreSQL Keycloak preparation

2026-11-16, Dev Server `/srv/yappai/hosting/epa-lab`.
Source at invocation: `d0117d8cb5f7402ada97c803bbb21d2361950116`.

## Owner authorization and accepted discontinuity

The owner explicitly resumed preparation **5.3–5.5** and confirmed:

- Existing Keycloak users may be recreated and signing keys regenerated.
- Existing sessions may be invalidated.
- Existing tokens and credentials need not remain compatible after cutover.
- No H2 migration is required.

This records acceptance of fresh identities, new credentials/keys and lost session/token
continuity. It does not claim that cached old JWKS instantly revoke already issued tokens.
New client credentials must match their BFF/consumer settings; users receive new credentials
privately. The later handoff must invalidate affected application sessions and handle cached
old keys/token expiry explicitly. No HAPI records are remapped to regenerated user IDs.

The owner initially withheld authorization for live PostgreSQL changes and database objects.
The subsequent **"Yes, you can move on"** approved the specifically proposed one-container
restart plus read-only postchecks. That restart completed successfully on 2026-11-16.
The next explicit **"I approve"** authorized the reviewed fresh `keycloak` database,
least-privilege `keycloak_app` role and schema with a privately generated credential. Those
objects are provisioned and isolated real-component verification passes. Live Keycloak
replacement/public activation remain excluded; **6.1/6.2 are unapproved**. The original 11
completed descriptions are unchanged; **5.3–5.5 are complete, 14/16 overall**. The
release packet, focused closing checks and strict OpenSpec validation pass.

## Read-only PostgreSQL diagnosis before the approved restart

| Check                                        | Actual result                                                                                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docker metadata                              | `epa-lab-res-server-db`, ID `541bd9743e09e8420b6e3d409c7773b37c7b30fc7ded4ded233270e0d1958bdf`, reports running/unhealthy, PID `1113141`.                  |
| Host process                                 | `/proc/1113141/{stat,comm,cgroup}` do not exist.                                                                                                           |
| `docker exec ... pg_isready -U hapi -d hapi` | Fails with `NotFound: task 541bd974... not found`.                                                                                                         |
| `docker top epa-lab-res-server-db`           | Same missing-task failure.                                                                                                                                 |
| Actual private TCP `172.24.0.3:5432`         | Connection refused, errno 111.                                                                                                                             |
| Filtered PostgreSQL log history              | Last matching startup reports ready at `2026-11-13T13:03:43.798946084Z`, after a clean prior shutdown. No current database startup/recovery was performed. |
| HAPI `/actuator/health/readiness`            | HTTP 200 despite the database failure; insufficient evidence of working SQL.                                                                               |
| Privileged containerd task inventory         | `sudo -n ctr ... tasks list` requires interactive authentication; not obtained. No runtime state was edited.                                               |

**Diagnosis at that checkpoint:** Docker running/PID metadata disagreed with the absent
task/process and refused TCP path. The database process was unavailable. The original cause
of task loss was not established; the evidence did not establish corruption or justify a
Docker/containerd daemon restart, volume repair or database reset. Availability was restored
by the approved single-container restart below.

Existing database image: `sha256:0cefaabd882e42bcb2a2f3dc56d3ce4770560ba62fd7f197f1a2e008fd5731ab`.
Existing volume: `epa-lab_res-server-data` at `/var/lib/postgresql/data`. Preserve both,
the container configuration, HAPI database `hapi`, its credentials and all existing data.

## Approved targeted recovery completed

The owner approved this exact operation and its read-only postchecks. Immediately before
execution, the container ID/image/volume/bindings and absent recorded PID matched the saved
baseline. One restart was executed, with exit 0:

```sh
docker restart --timeout 60 epa-lab-res-server-db
```

This uses its existing image, environment, volume and configured `SIGINT` stop signal.
It does not invoke Compose, pull an image, remove/recreate the container or touch another
service. Docker documents timeout/stop-signal behavior in its
[restart reference](https://docs.docker.com/reference/cli/docker/container/restart/).
No container recreation/removal, Compose apply, daemon restart, runtime-file edit or data
reset was needed. The same container started at `2026-11-16T14:05:04.778145385Z`, PID
`2944303`, and became healthy. Startup performed WAL crash recovery and reported ready at
`2026-11-16T14:05:05.368789458Z`. The transient startup FATAL was **"the database system
is starting up"** from a connection probe; recovery completed and later TCP/SQL checks pass.
No corruption or failed recovery is inferred from that normal startup sequence.

### Actual post-restart verification

| Check                               | Result                                                                                                                                                                                                                                          |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Container/image/volume              | Original container ID, immutable image, data volume and bindings preserved.                                                                                                                                                                     |
| Private TCP and `pg_isready`        | `172.24.0.3:5432` connects; PostgreSQL accepts connections.                                                                                                                                                                                     |
| Actual SQL                          | Read-only transactions succeed; server **16.15**.                                                                                                                                                                                               |
| Existing HAPI database              | `hapi`, owner `hapi`, unchanged default database ACL; **60 public tables**. No resource rows read or data/DDL writes performed.                                                                                                                 |
| HAPI connectivity                   | Ten idle PostgreSQL JDBC backends from `172.24.0.4`, matching the unchanged HAPI container; HAPI readiness HTTP 200.                                                                                                                            |
| Connection budget                   | 100 maximum, 3 reserved, 11 current client backends including the inspection connection: **86 non-reserved slots free** in this snapshot. HAPI configured pool maximum is 10 with no runtime environment override; candidate pool maximum is 4. |
| Existing administrator              | `hapi` has the existing superuser/CREATEDB/CREATEROLE capabilities; no privilege change was made.                                                                                                                                               |
| Fresh target names                  | No `keycloak` database and no `keycloak_app` role.                                                                                                                                                                                              |
| HAPI effective-access prerequisites | No PUBLIC relation/function execution grants, no default ACL entries, and no relevant role memberships; the public schema grants PUBLIC usage only. A new role receives no HAPI data privileges through these inspected paths.                  |
| Preservation                        | Other five project containers retain IDs/images/start times; all six retain images/mounts/bindings and all ten protected configuration hashes match.                                                                                            |

These checks establish recovered availability and the prerequisites for the reviewed fresh
database/role plan. They do not create those resources or verify application-role login.
The actual new role's effective HAPI access must still be tested after approved creation.

## Approved fresh database/role provisioning

The approved read-only catalog checks confirmed the version, existing administrator,
capacity, available names and HAPI grant prerequisites above. The following reproduces
the core read-only inventory; further checks covered PUBLIC relation/function grants,
default ACLs, HAPI client address and the pool bound. No resource rows, password hashes
or SQL query bodies were inspected.

```sql
BEGIN READ ONLY;
SHOW server_version;
SHOW max_connections;
SHOW superuser_reserved_connections;
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolreplication,
       rolbypassrls, rolconnlimit
FROM pg_roles WHERE rolname IN ('hapi', 'keycloak_app');
SELECT datname, pg_get_userbyid(datdba) AS owner, datacl
FROM pg_database WHERE datname IN ('hapi', 'keycloak');
SELECT pg_get_userbyid(roleid) AS granted_role,
       pg_get_userbyid(member) AS member, admin_option
FROM pg_auth_members;
SELECT datname, usename, count(*) FROM pg_stat_activity GROUP BY datname, usename;
ROLLBACK;
```

The proposed new resources are **only** database `keycloak`, role `keycloak_app` and schema
`keycloak` in that database. No additional PostgreSQL instance or volume is permitted.
The following reviewed first-create plan was approved after catalog checks confirmed
administrator `hapi` and unused target names. Creation used a fail-closed precondition guard
and no automatic reset/adoption of conflicts; the password step used the secure prompt
described below. This is a record of the executed addition, not permission to recreate it:

```sql
\set ON_ERROR_STOP on
SELECT NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'keycloak_app')
   AND NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak') AS names_free
\gset
\if :names_free
\else
  \echo 'Existing resources require owned-state verification; nothing was changed.'
  \quit
\endif

CREATE ROLE keycloak_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
  NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 6;
COMMENT ON ROLE keycloak_app IS 'public-playground-oauth-deployment:fresh-keycloak';
CREATE DATABASE keycloak OWNER hapi TEMPLATE template0;
COMMENT ON DATABASE keycloak IS 'public-playground-oauth-deployment:fresh-keycloak';
REVOKE ALL ON DATABASE keycloak FROM PUBLIC;
GRANT CONNECT ON DATABASE keycloak TO keycloak_app;
\connect keycloak hapi
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA keycloak AUTHORIZATION keycloak_app;
ALTER ROLE keycloak_app IN DATABASE keycloak SET search_path = keycloak;
\password keycloak_app
ALTER ROLE keycloak_app LOGIN;
```

Use an interactive administrator `psql -X` session with no echo/debug logging; `\password`
prompts without placing the password in shell arguments, source files or plaintext SQL.
Store the resulting credential only in the restricted candidate secret file. Review
server statement/error logging before supplying credentials. No password is present here.
[Role privileges](https://www.postgresql.org/docs/16/sql-createrole.html),
[fresh database creation](https://www.postgresql.org/docs/16/sql-createdatabase.html),
[password prompt behavior](https://www.postgresql.org/docs/16/app-psql.html#APP-PSQL-META-COMMAND-PASSWORD).

`keycloak_app` owns only its own schema/objects, not the database or HAPI objects. It has
no HAPI grants or role memberships and no cluster administration privileges. Verify
effective read/write denial in HAPI, including PUBLIC/inherited grants, before acceptance.
If that would require changing HAPI ACLs, stop rather than broadening this scope. Repeated
setup must verify the ownership markers, database/schema owner, grants, role flags and
credential authentication without resetting credentials. Conflicting/unowned or partially
created resources stop for review; never drop/recreate them to make a rerun pass.

The candidate pool is bounded to four connections; the role limit is six. The
recovered snapshot has 86 non-reserved slots available with the existing HAPI pool at its
configured maximum of ten connections. Recheck headroom before creation/startup rather
than changing HAPI or global PostgreSQL limits to make room.

Actual provisioning/verification results:

- Database `keycloak` is owned by existing administrator `hapi`; schema `keycloak` is owned
  by `keycloak_app`. The role is LOGIN, NOINHERIT, NOSUPERUSER, NOCREATEDB, NOCREATEROLE,
  NOREPLICATION, NOBYPASSRLS, connection limit six, with zero role memberships.
- Password authentication over TCP passes. An application-role create/insert/read probe
  within its schema passes and rolls back, leaving no probe table behind.
- Effective HAPI access checks as the actual role return **zero** permitted relations,
  sequences or user functions, no database CREATE and no public-schema CREATE. This does
  not claim that HAPI's existing PUBLIC CONNECT privilege was changed.
- HAPI's catalog/ownership/ACL/administrator fingerprint matches before and after
  provisioning and after the complete isolated runtime suite. HAPI configuration/data
  were not modified; the candidate role was not given HAPI grants.
- The password was generated privately, stored in a 0600 file and set with `psql \password`
  through a prompt with echo disabled. Statement/error logging was suppressed for that
  credential-setting session only; no global PostgreSQL logging or HAPI setting changed.
- After production startup the fresh schema contains **101 Keycloak tables**, all owned
  by the application role, no unexpected public tables and no leftover candidate connections.

Sanitized evidence: [fresh-keycloak-results.json](fresh-keycloak-results.json).
Private credential: `.local-backups/public-playground-oauth-deployment/20261116-fresh-keycloak-cegvpvg4/keycloak-postgres.env`.
Provisioning result: `database-provisioning-result.json` in the same protected directory.

## Immutable patched image — verified independently

Official registry: `quay.io/keycloak/keycloak:26.8.2`.

| Identity/check                                                 | Result                                                                                              |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Multi-platform index                                           | `sha256:c68e286cacd87b942ac1939a0a1481461109d6acd3a57dc496969a319a76bbf0`                           |
| Selected `linux/amd64` manifest and pulled immutable reference | `quay.io/keycloak/keycloak@sha256:4da21f9a53bcbac1026a0d654b740a81e98e5de4c45457076acc74b4d94b1551` |
| Local Docker image identity                                    | `sha256:4da21f9a53bcbac1026a0d654b740a81e98e5de4c45457076acc74b4d94b1551`                           |
| OCI version label                                              | `26.8.2`                                                                                            |
| Isolated version command                                       | `Keycloak 26.8.2`, JVM `21.0.13`, Linux amd64; exit 0.                                              |

The version command ran in a temporary `--network none --read-only --cap-drop ALL`
container with no mounts or published ports, then removed itself. The live 26.8.0 provider
was untouched. The official [26.8.2 release](https://github.com/keycloak/keycloak/releases/tag/26.8.2)
includes the recorded theme-resource security fix. Version/digest verification is not a
claim that startup passed by itself; the subsequent real production results are below.

## Verified production candidate and real-component results

[`docker-compose.keycloak-postgres.yml`](../../../infrastructure/docker-compose.keycloak-postgres.yml)
is a preparation-only overlay of the existing host model. It pins the immutable image,
uses production `start --import-realm`, private PostgreSQL/schema credentials, pool bounds
and existing health/hostname settings. Its `!override` mount list removes the inherited H2
volume and retains only the versioned fresh `epa-demo-realm.json` definition. It adds no
service/database container and is not installed into any live launch configuration.

The public overlay remains responsible for verified Nginx-peer forwarding settings. Use
the PostgreSQL overlay in both future activation and application-withdrawal models so a
fixture rollback cannot inadvertently restore development-mode/H2 startup.

The existing verifier now has an explicit `KEYCLOAK_POSTGRES_ENV_FILE` opt-in. Its default
historical 26.8.0/H2 mode remains intact. The new mode selects immutable 26.8.2, production
`start --import-realm`, the separately approved PostgreSQL database/schema/role and a bounded
pool, with loopback test listeners and no original H2 mount. A temporary bridge carries
loopback TLS traffic; the candidate also joins the existing database network. No new
PostgreSQL server or public ingress/provider replacement is introduced.

It reuses versioned ePA JSON, `public-realm.mjs`, `public-demo-account.mjs`, protocol checks
and the existing complete browser/proxy verifier. Stable private inputs permit safe reruns
without rotating existing owned credentials; every run provisions a distinct synthetic
public account. Fresh private callbacks match the declared existing private bindings.
Only the expected earlier loopback rehearsal callbacks can be reconciled; unrelated
callback/credential conflicts fail. No H2 state, password hash, key or session was imported.

Final successful run:

```sh
KEYCLOAK_POSTGRES_ENV_FILE=/srv/yappai/hosting/epa-lab/.local-backups/public-playground-oauth-deployment/20261116-fresh-keycloak-cegvpvg4/keycloak-postgres-verification.env \
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 \
node infrastructure/verify-public-runtime.mjs
```

Private run directory: `/tmp/epa-public-keycloak-EO2ELX`; sanitized retained results are
[fresh-keycloak-results.json](fresh-keycloak-results.json). The command uses real components,
existing candidate images and a generated CA trusted only by temporary clients/profiles;
hostname/chain checks stay enabled. The temporary HAPI instance uses its existing in-memory
synthetic test support; the live HAPI/PostgreSQL data/configuration remain untouched.

| Actual verification                | Result                                                                                                                                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh realm/account provisioning   | Versioned `epa-demo` and `playground-public`, fresh synthetic accounts, required password change, disabled registration and owned repeat/conflict behavior pass.                                         |
| Standard protocol profiles         | **27 public + 27 private standard checks** pass: real Code/S256 without PAR, signature/issuer/audience/nonce/lifetime checks, scope distinction and code/PKCE/credential/redirect/grant negatives.       |
| ePA/PAR                            | Genuine PAR accepted, non-PAR rejected; existing **six-test real NestJS ePA integration suite** passes with browser login/code exchange and ID-token validation.                                         |
| Provider restart                   | Real restart of only the temporary 26.8.2 candidate preserves fresh realm/user/client/key fingerprints; both protocol profiles and repeat provisioning pass afterward.                                   |
| Independent resource authorization | Real secured HAPI returns 200 with permission, 403 without permission and 401 for missing/ID Tokens, using HTTPS JWKS through the actual staged proxy chain.                                             |
| Browser mission                    | Real Firefox HTTPS login → clean callback → Workspace/refresh → synthetic read/Inspector → CSRF logout → old-auth rejection → owned safe history passes.                                                 |
| New ingress/security boundaries    | Actual Traefik/Nginx path/method/authority/peer/spoof/HTTPS/rate/cache/upstream-error/disclosure negatives pass.                                                                                         |
| Localization/accessibility         | German/English at 1366/390px, reduced motion and four WCAG A/AA scans pass; language changes retain run identity. Desktop/narrow screenshots were inspected with the existing visual contract preserved. |
| Withdrawal                         | Targeted recreation of only the temporary candidate SPA to the saved fixture image restores Catalog/conceptual ePA and closes API/provider forwarding, including safe late-callback logging.             |

Two intermediate verifier failures are retained transparently: a stale fixed-username lookup
was corrected for fresh per-run users, and the temporary BFF needed the existing legacy
private-HTTP opt-in for declared LAN ePA callbacks. The final run passes without resetting
the database, rotating owned secrets or weakening public HTTPS/TLS/PKCE/CSRF assertions.
These were verifier corrections; existing application images/code were not replaced.

The PostgreSQL production **candidate** gate passes. Live handoff and actual public
acceptance remain unapproved; loopback staging does not close either live-release gate.

## Prepared handoff credentials and original-provider recovery

`fresh-provider-bindings.env` in the protected preparation directory contains only the
new provider database/admin/legacy/private-standard/public-standard credential and callback
bindings required for handoff. It is 0600; no values are committed. Both the public and
application-withdrawal Compose models were rendered privately with this actual bundle:
database/admin/ePA/private-standard/public-standard credentials match the prepared provider.
The application-withdrawal model retains fresh-provider credentials; saved old credentials
belong only to a distinct approved return to original H2.

Use this bundle as the future `/secure/keycloak-postgres.env`, alongside the reviewed
public image/peer inputs. Do not use synthetic `configuration-check.env` values or the
temporary loopback hostname as deployment settings. The original host's global Keycloak
hostname/issuer contract remains the reviewed deployment setting; staged URLs are not public
acceptance. Each public demo account has a distinct private credential file in its run
directory; deliver only owner-selected synthetic credentials privately.

## Original H2 retention and recovery

Original provider: `epa-lab-keycloak`, image
`sha256:b0f60d489d51c5d113390bdf5461d4c06e6051be026c05549f2e1e10ec352bcc`;
original volume `epa-auth-lab_keycloak-data`. It remains attached to the unchanged live
26.8.0 provider. **It is preserved, but is not offline yet.** Taking it offline requires
the separately approved provider handoff; do not stop the working provider to claim this
step complete during preparation.

Matching original-provider configuration/admin bindings and the original image are already
saved under the protected preparation directory
`20261116-fresh-keycloak-cegvpvg4/original-provider`. The image archive is **265,416,192
bytes**, SHA-256 `0cec7e10d2fa64cc6785c94c010f8cdbe30a21441001beb5c083a15272857977`;
all **ten OCI blobs** verify. Files are 0600 in a 0700 directory. Rendering the current
host model with its saved original environment/image-only override verifies original
26.8.0 `start-dev`/H2 settings without applying them. This is an image/configuration
backup, not an H2 data backup; no live H2 files were copied.

At that handoff, cleanly stop only the original provider, recheck its saved recovery
configuration/admin inputs, detach and retain the original volume without writes. The
fresh production model must never mount/export/import/upgrade that volume. Keep it until
fresh-install acceptance; deletion requires a separate owner decision. Return to the
original image/H2 state is a private recovery decision after withdrawing public auth,
not data transfer or a database restore. Retain the new PostgreSQL state separately and
account for new users/keys/tokens; never merge the stores or serve both live authorities.

## Status and concrete next authorization

- **5.3 complete:** approved targeted recovery, TCP/SQL/HAPI connectivity, catalog/capacity/
  grant prerequisites, exact provisioning plan and owner discontinuity acceptance recorded.
- **5.4 complete:** approved least-privilege database/role/schema, immutable production
  provider, real fresh realms/flows/restart and the complete staged mission/security suite pass.
- **5.5 complete:** packet includes exact bindings, results, private handoff credentials,
  original-provider retention/recovery and targeted withdrawal. Final strict/configuration/
  preservation checks pass without executing a live handoff.
- **6.1/6.2:** unapproved, not executed. Public OAuth remains inactive.

No further preparation approval is needed. The remaining authorization boundary is the
exact live provider handoff/public release in 6.1, followed by actual public acceptance in
6.2. Neither is authorized or executed. Existing H2 remains attached to the unchanged live
provider until its approved clean stop/detachment; the fresh PostgreSQL state is retained
without an active candidate container.

Preservation baseline (metadata/hashes, **not database backups**):
`.local-backups/public-playground-oauth-deployment/20261116-fresh-keycloak-cegvpvg4/preservation-before.json`.
Approved restart result:
`.local-backups/public-playground-oauth-deployment/20261116-fresh-keycloak-cegvpvg4/postgresql-recovery-result.json`.

## Preparation verification

- The private, public and application-withdrawal Compose models render successfully with
  the PostgreSQL overlay. Structured comparisons confirm only the existing Keycloak
  service changes: no added service, no H2 data mount, and only the read-only fresh JSON
  import mount. All other service definitions, including HAPI/PostgreSQL, match their
  respective original models exactly. No model was applied.
- Withdrawal initially lacked the saved `PRIVATE_*` inputs; it passed after supplying the
  existing protected `previous-bindings.env`. No source setting was weakened to make it pass.
- Validation uses a private `configuration-check.env` with synthetic placeholders and
  random test-only secrets. It is not a deployment credential file or proof of live peer
  addresses. Results are in the same protected baseline directory's `configuration-results.json`.
- Existing public/standard realm definition tests pass **6/6**, alongside the actual
  PostgreSQL-backed protocol/browser suite described above.
- Existing SPA/BFF public-candidate image identities match the saved release packet.
- Strict OpenSpec validation passes with **zero issues**; scoped Prettier and
  `git diff --check` pass. All **53 local Markdown link occurrences** resolve; a changed-file
  scan finds none of the 14 protected credential values. The original 11 completed task
  descriptions and all 16 task IDs are preserved.
- The pre-recovery closing comparison preserved all six original container start times.
  After the approved restart, only PostgreSQL's start time/process changed; container IDs,
  images, mounts/bindings and all ten protected configuration hashes remain preserved.
  The temporary version-check container is removed; no other service restarted.
- A blank `KEYCLOAK_DB_PASSWORD` is rejected by Compose before rendering the provider
  candidate. Actual PostgreSQL TCP/password authentication, role-owned DDL and fresh
  production-provider protocol/browser flows also pass.
- The approved persistent changes are the one PostgreSQL restart and fresh Keycloak
  database/role/schema/state. No HAPI change, live provider stop/replacement, H2 copy or
  public activation occurred. **5.3–5.5 complete, 14/16 overall.** Only the unapproved live
  release/acceptance tasks 6.1/6.2 remain; no unresolved preparation blocker is recorded.
