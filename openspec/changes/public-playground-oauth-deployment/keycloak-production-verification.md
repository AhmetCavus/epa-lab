# Keycloak production prerequisite — preparation paused

2026-11-16, Dev Server checkout `/srv/yappai/hosting/epa-lab`.

## Authorization and task status

The owner explicitly invoked `openspec-apply-change public-playground-oauth-deployment`
with execution limited to tasks **5.3–5.5**. This authorizes their preparation work and
supersedes the earlier planning-only status of those tasks. It does not supply the
specific shared-instance DDL or live source-backup maintenance approval required by
task 5.3 and design decision 7. Tasks 6.1/6.2 and public activation remain unapproved.

**Progress: 11/16.** Task 5.3 is partially prepared and blocked; 5.4 cannot start its
real preservation rehearsal, and 5.5 cannot deliver a verified replacement release
packet. All three remain unchecked. No existing service, database, realm, volume,
credential, routing rule or dependency was changed. No recovery was attempted.

## Actual checks and results

Commands ran against the existing services; inspection output was restricted to
allowlisted settings and credential-free metadata. Docker needed tool sandbox
escalation, which succeeded; the failures below are actual daemon/network results,
not denied tool approval. No `compose up`, `down`, restart or DDL was run.

| Actual command / inspection                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Result                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git status --short --branch`, `git rev-parse HEAD`                                                                                                                                                                                                                                                                                                                                                                                                                                | `main`, source `77e65d54524253b84e46f422c9854021517d4f06`; four planning files already modified by the preceding approved update.                                                                                                      |
| `git submodule status services/res-server`                                                                                                                                                                                                                                                                                                                                                                                                                                         | Canonical `e65bafc279f02f44b19b47ca7326015886047a63`, unchanged.                                                                                                                                                                       |
| `openspec list --json`, `status --change public-playground-oauth-deployment --json`, `instructions apply --change public-playground-oauth-deployment --json` via pinned offline CLI 1.14.1                                                                                                                                                                                                                                                                                         | Repository root confirmed; `spec-driven`, ready, 11/16 complete. Scope limited by the owner's instruction to 5.3–5.5.                                                                                                                  |
| `docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'`; filtered `docker inspect` of the six project containers                                                                                                                                                                                                                                                                                                                                                    | Existing Keycloak, BFF, HAPI, public fixtures and private SPA report healthy. PostgreSQL reports unhealthy. Health labels alone are not fresh end-to-end acceptance.                                                                   |
| `docker exec epa-lab-res-server-db pg_isready -U hapi -d hapi`                                                                                                                                                                                                                                                                                                                                                                                                                     | Exit 128: `NotFound: task 541bd9743e09e8420b6e3d409c7773b37c7b30fc7ded4ded233270e0d1958bdf not found`. Repeating the read-only probe returned the same error.                                                                          |
| `docker top epa-lab-res-server-db`                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Exit 1, the same missing-task error. No restart or recreation followed.                                                                                                                                                                |
| `docker exec epa-lab-auth-client node -e 'const net=require("node:net"); const socket=net.connect({host:"172.24.0.3",port:5432}); socket.setTimeout(3000); socket.on("connect",()=>{console.log("PostgreSQL TCP reachable from existing BFF");socket.end()}); socket.on("timeout",()=>{console.log("PostgreSQL TCP timeout from existing BFF");socket.destroy();process.exitCode=1}); socket.on("error",e=>{console.log("PostgreSQL TCP failure: "+e.code);process.exitCode=1});'` | Exit 1: `PostgreSQL TCP failure: ECONNREFUSED`. This uses the existing host-network BFF and no database credentials.                                                                                                                   |
| Filtered `docker network inspect epa-lab_default`                                                                                                                                                                                                                                                                                                                                                                                                                                  | Existing network `99730318335e17a2b04073e4b0dd481cba8e03d3bce52f6ba5a05273c61da859`, subnet `172.24.0.0/16`, gateway `172.24.0.1`; database peer `172.24.0.3`.                                                                         |
| `docker image inspect` of the saved public candidate tags                                                                                                                                                                                                                                                                                                                                                                                                                          | SPA `sha256:00ebed371cafcf4aef6947bcc3f23201dce8571ace6dce97b63a0005d65c1bd4`; BFF `sha256:213618efa90f9f91dfbaa35c736f9de3aa299278a95e7da32eeb47c453a3c302`. Both still match the earlier release packet.                             |
| Private backup manifest comparison using Python `hashlib.sha256`                                                                                                                                                                                                                                                                                                                                                                                                                   | All four recorded configuration hashes, fixture image archive, previous-bindings environment and reviewed source patch match the 2026-11-14 manifest. Directory mode 0700; inspected files 0600.                                       |
| Inventory of repository-local saved backups                                                                                                                                                                                                                                                                                                                                                                                                                                        | The saved fixture/configuration/patch backups contain no consistent Keycloak data-volume backup or offline realm export. This does not establish whether an administrator has a separate backup elsewhere. No live H2 file was copied. |

The six-project-container metadata and six protected-file hashes were saved without
environment values under the ignored, mode-0700 directory
`.local-backups/public-playground-oauth-deployment/20261116-keycloak-prerequisite`.
These preservation manifests are **not** provider/database backups.

## Confirmed blockers and limits of the diagnosis

1. **Existing PostgreSQL unavailable through the required private path.** Docker metadata
   reports running, but its task cannot be inspected/executed and TCP is refused. The
   Docker/containerd state discrepancy is confirmed; its underlying cause and data
   integrity are unresolved. Do not infer database corruption or prescribe a daemon
   restart, shared-stack recreation or volume repair. Administrative recovery needs a
   separately reviewed targeted operation. Live role/schema/ACL/extension inventories,
   exact PostgreSQL minor version and connection headroom cannot currently be verified.
2. **Consistent preservation source unavailable in the inspected backups.** Live Keycloak
   still runs `start-dev --import-realm` with `KC_DB=dev-file`; source volume is
   `epa-auth-lab_keycloak-data`. An administrator may supply an independently verifiable
   consistent backup, or approve a bounded stop/copy/start maintenance window. Existing
   SPA rollback artifacts and masked/partial realm exports cannot substitute for it.
3. **Pinned provider security finding.** The actual Keycloak image is 26.8.0,
   `sha256:b0f60d489d51c5d113390bdf5461d4c06e6051be026c05549f2e1e10ec352bcc`.
   The project's [CVE-2026-110932 issue](https://github.com/keycloak/keycloak/issues/54689)
   identifies versions through 26.8.0; its [26.8.2 release](https://github.com/keycloak/keycloak/releases/tag/26.8.2)
   lists the fix. This concerns unauthenticated theme-resource disk exhaustion, relevant
   to the proposed public assets path. Exploitability was not tested and no upgrade was
   performed. Select and review an immutable patched provider candidate and its focused
   ePA/production compatibility evidence before treating the provider gate as closed.

The old isolated Cloudflare 403 is not a new outage finding. Pending privileged UFW
ordering/duplicate/backup-integrity inspection remains an operational follow-up, not a
reason to repeat broad readiness work.

## Bounded preparation for resumption — not executed or verified

### Production configuration and isolation

Reuse the existing PostgreSQL 16 service and volume; no second database container or
volume. Keycloak's [database guidance](https://www.keycloak.org/server/db) includes
PostgreSQL 16; compatibility of the exact chosen image and installed minor version
still requires the private rehearsal.

The intended production override affects only Keycloak: `start` (without startup
fixture import), `KC_DB=postgres`,
`KC_DB_URL=jdbc:postgresql://res-server-db:5432/keycloak`,
`KC_DB_USERNAME=keycloak_app`, `KC_DB_SCHEMA=keycloak`, `KC_HEALTH_ENABLED=true`,
`KC_HTTP_ENABLED=true` behind the existing TLS-terminating ingress, and a server-held
database password. Keep the legacy `KC_HOSTNAME=http://192.168.178.131:5555`, explicit
hostname checking and the public realm's fixed HTTPS frontend URL. Trust forwarded
headers only from the exact verified Nginx backend peer; do not trust the bridge subnet.
Prove the two realm authorities together before live approval. Administration,
management and PostgreSQL stay outside public routing.

The production container must not import `epa-demo-realm.json` or write to the retained
H2 source volume. PostgreSQL stores its state; no additional persistent volume is
needed. Do not change the live Compose model while the production candidate and
recovery remain unverified. Existing production proxy/fixture withdrawal assets remain
the application boundary; a provider-only override must be included in future approved
activation and withdrawal commands so neither can accidentally restore `start-dev`.

Proposed pool bounds for review are initial/minimum 1 and maximum 10 for production,
maximum 4 for the single rehearsal candidate, with two additional administrative/import
connections reserved per candidate. These are not a verified capacity allocation.
Measure `max_connections`, reserved slots, existing usage and HAPI's configured/peak
budget after database recovery before approving simultaneous candidate work. Reject
insufficient headroom rather than increasing global limits or changing HAPI.

### Read-only database inventory after administrative recovery

Run only after the existing service is usable; do not create roles to make the
inventory work. The current configured bootstrap username is `hapi`. Its historical
OID/privileges do not substitute for a current catalog check.

```sh
docker exec -i epa-lab-res-server-db psql -X -U hapi -d hapi -v ON_ERROR_STOP=1 <<'SQL'
BEGIN READ ONLY;
SHOW server_version;
SHOW max_connections;
SHOW superuser_reserved_connections;
SELECT oid, rolname, rolsuper, rolcreatedb, rolcreaterole,
       rolreplication, rolbypassrls, rolconnlimit
FROM pg_roles
WHERE rolname IN ('hapi', 'keycloak_app', 'keycloak_rehearsal_app_20261116');
SELECT datname, pg_get_userbyid(datdba) AS owner, datacl, datconnlimit
FROM pg_database;
SELECT nspname, pg_get_userbyid(nspowner) AS owner, nspacl
FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname <> 'information_schema';
SELECT extname, extversion, pg_get_userbyid(extowner) AS owner FROM pg_extension;
SELECT pg_get_userbyid(roleid) AS granted_role,
       pg_get_userbyid(member) AS member, admin_option FROM pg_auth_members;
SELECT n.nspname, c.relkind, pg_get_userbyid(c.relowner) AS owner, c.relacl
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema';
SELECT defaclrole::regrole, defaclnamespace::regnamespace, defaclobjtype, defaclacl
FROM pg_default_acl;
SELECT datname, usename, count(*) FROM pg_stat_activity GROUP BY datname, usename;
ROLLBACK;
SQL
```

No patient/resource rows, password hashes, session values or SQL query bodies are
requested. Keep catalog output private where it contains object names. Check PUBLIC
grants and membership reachability as well as direct grants. If denying HAPI data access
requires changing HAPI ACLs, stop for scope review; do not silently alter them.

### Exact proposed owned targets and provisioning contract

| Use                                     | Database                      | Role                              | Schema     | Container                                    |
| --------------------------------------- | ----------------------------- | --------------------------------- | ---------- | -------------------------------------------- |
| Disposable rehearsal                    | `keycloak_rehearsal_20261116` | `keycloak_rehearsal_app_20261116` | `keycloak` | `epa-keycloak-production-rehearsal-20261116` |
| Eventual live transition, task 6.1 only | `keycloak`                    | `keycloak_app`                    | `keycloak` | existing Keycloak service                    |

These are review names, not reserved or created resources. After recovery, inspect all
names before any writes. Specific approval must name the rehearsal database/role and
grants; approval of tasks 5.3–5.5 alone does not authorize shared-instance DDL.

The minimal provisioning contract is: administration owns the new database; its dedicated
LOGIN role has NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS and no
memberships. Grant CONNECT and ownership/USAGE/CREATE of only schema `keycloak`, sufficient
for its own verified Liquibase/Hibernate object lifecycle. Revoke PUBLIC access on only
the new database/public schema. Require separate credentials, bounded role/database
connection limits and successful own-schema DDL and negative HAPI-access tests. Do not
grant HAPI membership, database-wide CREATE, extension installation or cross-database
object privileges to work around errors. Exact grants remain pending the catalog check
and actual Keycloak rehearsal; no executable provisioning script is claimed complete.

Idempotent provisioning must preflight both resources and a protected ownership journal
before writes. Create only absent approved resources; repeat verifies ownership, role
flags, memberships, ACLs, connection limits, schema and supplied credential authentication
without rotating it. Existing unowned/conflicting resources or interrupted partial state
stop for review. Never drop/recreate, adopt or broaden an existing resource automatically.
Rehearsal cleanup requires the exact created-resource journal, stopped owned candidate,
retained evidence and separately approved disposal; no CASCADE, live database changes or
shared-volume operation. An existing-volume/database reset is never recovery.

### Consistent source, sessions and targeted recovery

Prefer an existing administrator-provided consistent cold backup if its version,
consistency, provenance and restore can be verified. Otherwise the proposed maintenance
is limited to `docker stop --time 60 epa-lab-keycloak`, copying the stopped container's
`/opt/keycloak/data` into a new restricted backup directory with `docker cp`, verifying
the copy/manifest, and `docker start epa-lab-keycloak` using the same ID/image/settings.
Do not execute this without a separately approved maintenance window. Preserve the
original volume; never run an exporter against live H2. Capture original image and
configuration privately with 0700/0600 protections. Back up the provider image for
recovery and test private readiness/ePA after resuming the source. Copy duration and
maintenance tolerance remain open until the owner selects the source/window.

Work only on a writable isolated copy of that cold backup; retain the protected original.
Use the original pinned image offline to export all realms/users from the copy with no
network, then import into the approved isolated PostgreSQL target using the reviewed
production candidate. Do not run startup fixture import, regenerate legacy keys, reset
passwords or provision replacement legacy users. Compare realm/user IDs, credential
behavior, client secrets/configuration, signing-key fingerprints, administrative recovery,
issuers and PAR privately; report only comparison results. Exercise real standard and
ePA/PAR authentication, negative policies and candidate restart/recovery. Candidate
listeners must be loopback-only, never on `dev-proxy`; never collide with live ports or
cluster with the live source. Exact free loopback ports and pinned-image cluster settings
must be verified before its create command is approved.

Keycloak's [export guidance](https://www.keycloak.org/server/importExport) requires stopped
nodes for consistency and excludes persisted sessions, revoked tokens and other state.
Consequently an export is a transfer artifact, not a full backup. The exact pinned-version
session/revocation impact is unresolved; this run does not authorize losing sessions or
revocation state. Review a bounded reauthentication/token-drain or other supported safe
transition with the owner after inventorying the actual realm lifetimes/state, retaining
the legacy issuer and cryptographic keys. Do not claim immediate bearer revocation or
weaken authentication to preserve a session.

Before live approval rehearse two distinct recoveries: application withdrawal using the
saved fixture and safe-log proxy configuration, and provider recovery using the retained
original source/configuration. Keep the new PostgreSQL target for investigation. Switching
back after identity/password/policy/revocation writes needs explicit reconciliation and
owner review; never silently serve stale state. No shared PostgreSQL restore, HAPI restore,
volume reset or broad stack shutdown belongs to either recovery.

## Remaining work and next authorization boundary

First obtain administrative recovery of the existing PostgreSQL service or a reviewed
targeted recovery proposal. Do not treat this report as authorization for repair. Then
complete read-only catalogs/capacity, select the patched provider candidate, verify an
existing cold source or obtain its maintenance approval, and present exact rehearsal DDL,
container/port/cluster settings and session/revocation decisions for operational approval.
Only then can task 5.3 finish and task 5.4 execute. Task 5.5 remains an incomplete packet
refresh until actual production-mode preservation, integration and rollback evidence exist.

No new integration/security/Compose production-candidate pass is claimed here. Earlier
real-component results remain dated evidence in [preparation-verification.md](preparation-verification.md).
The [release packet](release-packet.md) remains blocked for public use.

## Closing verification

- The unchanged host model passes
  `docker compose --env-file .env -f infrastructure/docker-compose.host.yml config --quiet`.
  This is syntax/configuration validation, not a new production-provider startup test.
- Strict OpenSpec validation with offline CLI 1.14.1 passes with zero issues.
- Scoped Prettier and `git diff --check` pass. Nineteen local link targets resolve.
- All 13 original task IDs and checkbox states, and all 11 completed descriptions,
  are preserved. The preceding planning revision added 5.3–5.5 and revised the future
  6.1 description; it did not execute or complete that release task.
- Closing read-only comparison matches all six project container IDs/images/start
  times, bindings, mounts and networks, plus six protected configuration-file hashes.
  No new container was created; PostgreSQL's failure was not repaired or concealed.
- Application/realm files, dependency manifests, live Compose/proxy configuration,
  databases and volumes remain untouched. No integration test or public acceptance
  was substituted with mocks. The new real production-preservation tests did not run.
