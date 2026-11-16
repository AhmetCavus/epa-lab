# Public deployment preparation — verification

Date: 2026-11-13, Europe/Berlin. Preparation is authorized; public release is not.
This record concerns `public-playground-oauth-deployment`; change 001's completed tasks
and dated verification reports remain untouched.

## Preparation authorization

The owner explicitly authorized implementation and verification of **tasks 1.1–5.2**, with
the instructions “Do not execute tasks 6.1 or 6.2” and “Do not activate public OAuth
authentication yet.” The subsequent planning revision simplified HAPI/public-user handling,
and the renewed `$openspec-apply-change public-playground-oauth-deployment` request resumes
preparation against that revised plan. This is existing owner authorization, not a request
for another preparation approval.

Approved preparation follows the current [proposal](proposal.md), [design](design.md),
[specification](specs/public-playground-runtime/spec.md) and [tasks](tasks.md):

- Reuse the existing PostgreSQL 16 instance/volume and HAPI database/data. Rehearse only the
  targeted `hapi_app` privilege/credential transition on isolated synthetic targets; do not
  apply it to live HAPI or alter bootstrap administrator `hapi` (OID 10).
- Prepare `keycloak_app` database access and the legacy Keycloak production-storage
  transition using a consistent source copy. Preserve legacy ePA users, keys, clients,
  issuer and PAR policy; obtain separate maintenance authorization if a source backup
  requires stopping the live provider.
- Provision the public realm and new individual synthetic accounts fresh in isolated
  verification. Prepare production SPA/BFF/proxy bindings and tests without activating
  public ingress. Reuse existing services; create no additional PostgreSQL container.
- Preserve current public fixtures, routing, existing services/volumes and application
  behavior. No real patient data, generic migration framework or unrelated refactoring.

Tasks **6.1 and 6.2 remain excluded**. Live ownership/credential changes, provider cutover
and public routing/activation require separate explicit authorization. Completing preparation
must produce the exact tested release packet for owner review; preparation approval is
neither rollout approval nor evidence that acceptance has passed. Do not archive the change.

## Task 1.1 — authorization and alignment

Starting tree: clean `main...origin/main`, parent
`7f42743b2cc7f4ca626ff451cb07f8473ed98e2c`. HAPI submodule:
`e65bafc279f02f44b19b47ca7326015886047a63`, clean recursive status.
OpenSpec selects this repository, schema `spec-driven`, state `ready`, initially **0/13**.
The returned instruction is to read context files, work through pending tasks and pause on
blockers; no extra operation guidance or required context was returned.

The approval record aligns active agent, root/product, architecture-context, Catalog,
Workspace and infrastructure guidance. ADR-0001 through ADR-0004 retain their accepted
decisions: reuse the SPA/BFF/Keycloak/HAPI boundaries, generic Workspace, capability-first
organization and German-default localization. No new ADR or design change is needed to
record this bounded preparation approval. The existing integration Compose profile starts
another PostgreSQL container and is explicitly excluded from this change's rehearsals.

Task IDs, all acceptance requirements/scenarios, change 001 history and the public fixture
boundary are preserved. Task completion records documentation verification only; it does
not establish runtime readiness, capacity, legacy preservation or public availability.

Task 1.1 checks passed before completion:

| Check                                                                                                | Actual result                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `openspec validate public-playground-oauth-deployment --strict --json` via pinned offline CLI 1.14.1 | Valid; zero issues.                                                                                                                                                                        |
| Local document/approval-anchor check                                                                 | 11 affected documents, 117 local links resolve.                                                                                                                                            |
| Task/acceptance/history comparison against starting HEAD                                             | All 13 task IDs retained; task 1.1 only clarifies the approval-recording phase. Other task descriptions, all 17 requirements/39 scenarios, accepted ADRs and change 001 history unchanged. |
| `git diff --check` and scoped Prettier                                                               | Pass; documentation changes only.                                                                                                                                                          |

CLI invocation used throughout this record:

```sh
OPENSPEC_TELEMETRY=0 npm exec --offline --yes --cache /tmp/epa-001-task24-npm-cache --package @fission-ai/openspec@1.14.1 -- openspec validate public-playground-oauth-deployment --strict --json
```

The task checkbox was then changed through its refreshed CLI `sourcePath`/line after an
exact-description check. A second `instructions apply` confirmed task 1.1 done and
**1/13 complete**, next task 1.2. No other task was checked.

## Task 1.2 — partial preflight; blocked

**Not complete. Stop before dependent implementation/rehearsals.** The required privileged
firewall evidence remains inaccessible. Scope approval exists; the blocker is operating-system
authentication, not an automatic tool-approval rejection and not a request to reapprove preparation.

Actual read-only checks:

| Command / inspection                                                                            | Result                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sudo -n ufw status numbered`                                                                   | Exit 1: `sudo: interactive authentication is required`.                                                                                                                                  |
| `sudo -n ufw show raw`                                                                          | Exit 1, same authentication error.                                                                                                                                                       |
| `sudo -n tar -tzf /root/ufw-backups/ufw-20261113-171331.tgz`                                    | Exit 1, same error; existence/contents/integrity were not verified.                                                                                                                      |
| `ss -lnt '( sport = :80 or sport = :3000 or sport = :5555 or sport = :8083 or sport = :5173 )'` | Existing listeners: BFF `192.168.178.131:3000`, private SPA `:5173`, HAPI `:8083`; Keycloak `0.0.0.0:5555`; Traefik IPv4/IPv6 `:80`. No binding changed.                                 |
| `docker ps -aq`, filtered `docker inspect`                                                      | 46 existing containers; all six lab containers running/healthy. No creation, stop, restart or recreation.                                                                                |
| `docker network inspect epa-lab_default dev-proxy`                                              | Existing network identities and peers below; no network change.                                                                                                                          |
| `/proc/meminfo`, CPU/load and filesystem metadata                                               | 20 CPUs; load averages 1.06/1.24/1.43; RAM 30.6 GiB total, about 4.5 GiB available; swap 8 GiB with only 56 KiB free. Workspace filesystem has about 1.17 TiB free.                      |
| `vmstat 1 3`                                                                                    | Two interval samples show 95–97% idle CPU and no swap-in/out during those intervals. This short sample does not verify peak workload, database-volume I/O or rehearsal/restore headroom. |

The preflight metadata snapshot is
`/tmp/epa-public-preparation-preflight/preservation-before.json` (directory 0700, file 0600).
It holds container IDs/images/start times/mounts/ports/network metadata and hashes of seven
protected files, including `.env`, Compose manifests and the watched Traefik project file.
It contains no credential values and **is not a Keycloak/database backup**.

| Existing component | Observed identity / boundary                                                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PostgreSQL         | `epa-lab-res-server-db`, `postgres:16-alpine`, image `sha256:0cefaabd882e42bcb2a2f3dc56d3ce4770560ba62fd7f197f1a2e008fd5731ab`; volume `epa-lab_res-server-data`; peer `172.24.0.3`; 5432 unpublished. |
| Keycloak           | Image `sha256:b0f60d489d51c5d113390bdf5461d4c06e6051be026c05549f2e1e10ec352bcc`; volume `epa-auth-lab_keycloak-data`; peer `172.24.0.2`.                                                               |
| HAPI               | Image `sha256:ba8049c9074f35f931af8878dd6eda71b728c37bc143bfdaac81a172446a4927`; peer `172.24.0.4`; Docker memory limit unset, consistent with the documented host-lifecycle drift.                    |
| Public fixture SPA | Image `sha256:6226f17b300586fae1ea71149cb94c30d1bc0c231e99872b46c77d4b1277fa25`; peer `172.18.0.4`; existing Nginx service unchanged.                                                                  |
| Backend bridge     | `epa-lab_default`, ID `99730318335e17a2b04073e4b0dd481cba8e03d3bce52f6ba5a05273c61da859`, subnet `172.24.0.0/16`, gateway `172.24.0.1`.                                                                |
| Edge peers         | `dev-proxy` subnet `172.18.0.0/16`; cloudflared `172.18.0.6`, Traefik `172.18.0.20`. These configured addresses do not independently prove actual Tunnel routing or trusted socket identity.           |

Required privileged follow-up remains the existing finding from
[change 001](../001-oidc-pkce/firewall-verification.md): effective rule order, duplicate
counts, default-policy comparison and protected backup integrity. A functioning HTTP path
or historical administrator command invocation does not replace that evidence.

An administrator can supply these **read-only** results or an existing scoped read-only
helper; do not send passwords or grant unrestricted administration:

```sh
sudo ufw status numbered
sudo ufw status verbose
sudo ufw show raw
sudo stat -c '%U %G %a %s %y' /root/ufw-backups/ufw-20261113-171331.tgz
sudo gzip -t /root/ufw-backups/ufw-20261113-171331.tgz
sudo tar -tzf /root/ufw-backups/ufw-20261113-171331.tgz
sudo tar -xOzf /root/ufw-backups/ufw-20261113-171331.tgz default/ufw ufw/user.rules ufw/user6.rules
```

Compare effective policies/rules with that pre-correction archive, checking the exact two
previously approved bridge/source/destination/port exceptions and duplicates. These are
inspection commands; no firewall rule, sudo configuration or container should be changed.

Other task-1.2 gates are **not yet verified**, rather than reported absent or passed:
current SQL privilege/recovery recheck, actual Tunnel/cache/log policy and external direct-origin
isolation, a consistent legacy H2 source or authorized backup window, combined pool/restore/load
capacity, recovery objectives and monitoring/scheduler/alert ownership. The memory/swap snapshot
does not qualify the host for concurrent application rehearsals; no load test was started.
Historical catalog findings in `design.md` are not relabeled as new verification.

Tasks 2.1–5.2 have not started. No application, deployment or database configuration was
changed; no release packet can be called verified at this point. Tasks 6.1/6.2 remain
unchecked and excluded. The change is not archived.

## Preservation and public reachability at pause

The end-of-preflight comparison against the private snapshot passed for all **46 containers**:
IDs, images, start times, state/health, memory limits, mounts, bindings and network addresses
are unchanged. All **seven protected file hashes** match, including `.env`, Compose and the
watched project routing configuration. No live rollback is needed because no live change
was applied.

A credential-free HTTPS GET to `https://auth-playground.yappai.de/missions`, with normal TLS
verification and redirect following disabled, returned **403**, content type
`text/plain; charset=UTF-8`. A confirming response identified `Server: cloudflare` and
`CF-Ray: a5a152b97b43d2ea-FRA`; no intermediary block-reason header was returned. No raw
response body, cookies or credentials were logged. The cause and scope of the denial are
**unresolved**: this server-side probe cannot establish availability for other visitors or
attribute the denial to a particular Cloudflare rule or origin component.

Inside the unchanged public fixture container, both read-only checks succeeded:

```sh
docker exec epa-lab-playground wget -q --spider http://127.0.0.1/health
docker exec epa-lab-playground wget -q --spider http://127.0.0.1/missions
```

Both commands exited 0. Internal fixture availability does not prove public HTTPS
acceptance. The task-1.2 Tunnel/edge prerequisite therefore also needs the actual provider
policy/route evidence and an independent reachability check explaining the 403; no route,
firewall, proxy trust, user-agent policy or OAuth setting was changed to obtain a pass.

Preparation is paused at **task 1.2, 1/13 complete** under the existing operational gate.
The [apply skill](../../../.agents/skills/openspec-apply-change/SKILL.md) instructs:
“Pause on errors, blockers, or unclear requirements - don't guess.” Resume prerequisite
verification with administrator UFW evidence and the edge-denial diagnosis; then settle
the remaining source-copy, capacity and operating values before dependent rehearsals.
