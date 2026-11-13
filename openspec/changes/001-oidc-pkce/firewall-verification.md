# Task 9.5 — Owner-applied firewall correction: bridge connectivity verified

Date: 2026-11-13, Europe/Berlin. **Owner-applied correction evaluated: TCP/HTTP checks pass.**
The owner performed the approved firewall steps in an administrator terminal after the
agent's administrative preflight was blocked. Read-only checks from the affected bridge
now connect to both approved ports and return HTTP 200. The agent added or removed no rules
and performed no deployment. **Task 9.5 remains unchecked, 49/50.**

## Authorization and confirmed diagnosis

The [separate owner approval](private-deployment-plan.md#separate-firewall-only-owner-approval--2026-11-13)
permits only these UFW input exceptions:

| Ingress bridge    | Source          | Destination       | Protocol / port |
| ----------------- | --------------- | ----------------- | --------------- |
| `br-99730318335e` | `172.24.0.0/16` | `192.168.178.131` | TCP 3000        |
| `br-99730318335e` | `172.24.0.0/16` | `192.168.178.131` | TCP 5555        |

The preceding read-only investigation confirmed UFW blocks in `/var/log/ufw.log`:
2026-11-13 16:13:33 CET for port 3000 and 16:51:13 CET for port 5555. The latter matches
the approved temporary probe's source `172.24.0.5:50750`. Both LAN targets and both bridge
gateway targets timed out from that probe; Keycloak Docker names/peer IP and HAPI service
readiness returned HTTP 200. Host requests to the LAN BFF/JWKS returned 200. The probe was
removed and the original 45 containers were preserved. Those are diagnostic results from
before this approval, not post-correction verification.

No issuer, JWKS URL, same-origin rule, JWT check or OAuth policy is changed by the approved
correction. It adds no listener or physical-interface ingress permission. Docker networks,
containers, volumes, public routing and default firewall policies must stay unchanged.

## Initial agent preflight — before the owner correction

Starting tree was clean `main...origin/main`, parent
`fa570761434837f97fc960e074ee1a6116c4e71f`. OpenSpec returned the existing repository
root, `spec-driven`, `ready`, 49 complete / 1 remaining; task 9.5 is the sole unchecked task.
Approval is recorded before any firewall mutation. Preservation/admin-access artifacts
are under `/tmp/epa-001-task95-firewall-20261113/`, directory mode 0700.

| Check / actual command                      | Observed result                                                                                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker network inspect epa-lab_default`    | ID `99730318335e17a2b04073e4b0dd481cba8e03d3bce52f6ba5a05273c61da859`; subnet `172.24.0.0/16`; gateway `172.24.0.1`; default bridge options |
| `ip -j -4 address show dev br-99730318335e` | Bridge UP; `172.24.0.1/16`                                                                                                                  |
| Host listener inspection                    | BFF `192.168.178.131:3000`; existing Keycloak proxy `0.0.0.0:5555`; no port-5173 listener                                                   |
| `sudo -n ufw status numbered`               | Exit 1: `sudo: interactive authentication is required`                                                                                      |
| `sudo -n ufw show raw`                      | Same failure                                                                                                                                |
| `sudo -n iptables -S INPUT`                 | Same failure                                                                                                                                |
| `sudo -n iptables -S ufw-user-input`        | Same failure                                                                                                                                |
| Follow-up `sudo -n true`                    | Exit 1, same authentication requirement                                                                                                     |

**Agent firewall changes at that stage: none.** The complete UFW backup and active
ordering/duplicate inspection were inaccessible. The agent executed neither insertion
command and had no newly inserted rules to roll back. Post-correction connectivity was
then unverified. This was an OS administrative-access blocker; no automatic tool-approval
rejection occurred. The owner's scope approval remained recorded.

The owner selected scoped noninteractive administrative execution. Retrying `sudo -n -l`,
the two UFW inspection commands and `sudo -n iptables -S ufw-user-input` still returned
the same authentication error. The owner subsequently confirmed that the terminal steps
were already done and requested evaluation. No attempt was made to grant privileges,
alter sudoers, create a privileged container or modify a service.

The preservation audit passes: all 45 original containers retain IDs, images, start times,
configurations, mounts, ports and network settings; network/volume inventories are unchanged.
Of 267 protected files, 265 remain byte-identical; only the existing approval/task notes
change, alongside this new evidence document. Root `.env`, public routing, application and
packaging files are unchanged. All 50 task descriptions/checkboxes, parent HEAD/index and
the clean canonical HAPI commit are preserved. Documentation formatting, 42 documents /
281 local links, six shell-block syntax checks, the embedded Python syntax check,
`git diff --check` and strict OpenSpec validation passed at that stage. The live
post-correction evaluation follows below; documentation checks alone are not network evidence.

## Owner execution and read-only evaluation — 17:13–17:15 CET

The owner stated that the correction was already applied. Accessible `/var/log/auth.log`
records the following administrator command invocations on 2026-11-13:

| Time CET | Recorded command                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 17:13:17 | `ufw status numbered`                                                                                                                 |
| 17:13:31 | `install -d -m 700 /root/ufw-backups`                                                                                                 |
| 17:13:31 | `tar -C /etc -czf /root/ufw-backups/ufw-20261113-171331.tgz ufw default/ufw`                                                          |
| 17:13:31 | `ufw insert 1 allow in on br-99730318335e proto tcp from 172.24.0.0/16 to 192.168.178.131 port 3000 comment epa-001-private-bff`      |
| 17:13:32 | `ufw insert 1 allow in on br-99730318335e proto tcp from 172.24.0.0/16 to 192.168.178.131 port 5555 comment epa-001-private-keycloak` |
| 17:13:32 | `ufw status numbered`                                                                                                                 |

The insertion commands match the two approved source/interface/destination/protocol/port
tuples and comments exactly. The audit log establishes command invocations; it does not
contain their terminal output, exit status, current rule counts or archive contents.
The root-private archive cannot be independently checked by this session. Active UFW/
iptables inspection still requires interactive authentication, so exact effective ordering,
absence of duplicates, backup integrity and the complete default-policy/ruleset comparison
remain independently unverified. No additional administrator access is needed for the
completed network evaluation, and no rule was reapplied or deleted.

At **17:15:20 CET**, read-only commands inside the existing `epa-lab-keycloak` container
tested the two configured LAN endpoints. That unchanged container uses `172.24.0.2` on
the affected `epa-lab_default` bridge. No temporary container, file copy, host mount,
configuration change or credential was used. Bash opened each TCP socket, sent one
credential-free HTTP GET and retained only its status line; an internal timeout bounded
each command to eight seconds.

| Bridge-source request                                                | TCP result | HTTP result |
| -------------------------------------------------------------------- | ---------- | ----------- |
| `192.168.178.131:3000/health/ready`                                  | Connected  | 200         |
| `192.168.178.131:5555/realms/epa-demo/protocol/openid-connect/certs` | Connected  | 200         |

Equivalent standalone invocations for the actual probe are:

```bash
probe_script='if ! exec 3<>"/dev/tcp/$1/$2"; then printf "TCP_FAILED\n"; exit 2; fi
printf "TCP_CONNECTED\n"
printf "GET %s HTTP/1.1\r\nHost: %s:%s\r\nAccept: application/json\r\nConnection: close\r\n\r\n" "$3" "$1" "$2" >&3
if ! IFS= read -r -t 4 status <&3; then printf "HTTP_STATUS_UNAVAILABLE\n"; exit 3; fi
printf "%s\n" "$status"
exec 3<&-
exec 3>&-
[[ "$status" == HTTP/*" 200 "* ]]'
docker exec epa-lab-keycloak /usr/bin/timeout 8 /bin/bash --noprofile --norc -c "$probe_script" -- 192.168.178.131 3000 /health/ready
docker exec epa-lab-keycloak /usr/bin/timeout 8 /bin/bash --noprofile --norc -c "$probe_script" -- 192.168.178.131 5555 /realms/epa-demo/protocol/openid-connect/certs
```

Both actual commands exited 0. The safe machine-readable result is
`/tmp/epa-001-task95-firewall-20261113/owner-applied-connectivity.json`.
**Bridge TCP/HTTP connectivity to the BFF and configured JWKS is restored.** This is a
network result, not a new authenticated HAPI read, HAPI-process JWKS observation or
persistent private-browser acceptance result. The private SPA remains absent and the
standard BFF profile remains disabled. No rollback was performed because both connectivity
checks passed; no agent-inserted rule exists to roll back. Stop after this evaluation.

Final evaluation preservation passes for all 45 original container identities/images/start
times/configurations/mounts/ports/networks and the complete Docker network/volume inventories.
Of 267 captured protected files, 262 remain unchanged; only the three active README status
notes and existing OpenSpec plan/task notes change, alongside this evidence file. `.env`,
application/packaging/security code, public routing, historical deployment reports, parent
HEAD/index and clean HAPI pointer are preserved. All 50 task descriptions and checkboxes are
unchanged. Formatting, 42 documents / 285 local links, 22 shell-block syntax checks across
the six changed documents, embedded Python syntax, `git diff --check` and strict OpenSpec
validation pass. Full persistent-runtime acceptance remains outside this firewall evaluation.

## Reviewed administrator procedure — retained as reference

The owner used the terminal commands recorded above. The longer procedure below was not
executed by the agent; do not reapply insertions merely to repeat this successful evaluation.

Run in an administrator-authenticated terminal. First confirm the exact bridge ID/subnet
above and inspect the active UFW/input-chain ordering. Save a protected backup before
changing anything. Check for the exact source/destination/interface/protocol/port tuples;
skip existing identical rules and record precisely which ports are newly inserted.
If the active ordering has an earlier applicable drop outside the UFW user-input chain,
stop for review instead of changing another chain or policy.

```bash
docker network inspect epa-lab_default --format '{{json .Id}} {{json .IPAM.Config}}'
ip -j -4 address show dev br-99730318335e
sudo ufw status numbered
sudo ufw show raw
sudo iptables -S INPUT
sudo iptables -S ufw-before-input
sudo iptables -S ufw-user-input
firewall_backup="/var/backups/epa-001-task95-ufw-$(date -u +%Y%m%dT%H%M%SZ)"
sudo install -d -m 0700 "$firewall_backup"
sudo tar -czf "$firewall_backup/ufw-before.tar.gz" -C / etc/ufw etc/default/ufw
sudo chmod 0600 "$firewall_backup/ufw-before.tar.gz"
sudo tar -tzf "$firewall_backup/ufw-before.tar.gz"
```

Insert only absent reviewed rules. These are the exact approved commands; do not enable,
disable, reset or reload UFW, change its defaults, or modify Docker NAT/forwarding rules.

```bash
sudo ufw insert 1 allow in on br-99730318335e proto tcp \
  from 172.24.0.0/16 to 192.168.178.131 port 3000 comment 'epa-001-private-bff'
sudo ufw insert 1 allow in on br-99730318335e proto tcp \
  from 172.24.0.0/16 to 192.168.178.131 port 5555 comment 'epa-001-private-keycloak'
sudo ufw status numbered
sudo ufw show raw
```

Verify from a host process entering only the existing HAPI network namespace. This creates
no Docker container and changes no namespace configuration or existing container process.
It sends no credentials, reads no FHIR data and prints only source IP, port and bounded
TCP/HTTP results. Both targets must connect and return HTTP 200; redirects are not followed.
Confirm the HAPI container ID/start time before and after, and retain the results privately.

```bash
hapi_pid="$(docker inspect --format '{{.State.Pid}}' epa-lab-res-server)"
sudo nsenter --target "$hapi_pid" --net -- /usr/bin/python3 - <<'PY'
import http.client
import ipaddress
import json
import socket
import sys

targets = [(3000, '/health/ready'),
           (5555, '/realms/epa-demo/protocol/openid-connect/certs')]
passed = True
for port, path in targets:
    result = {'destination': '192.168.178.131', 'port': port}
    connection = None
    try:
        with socket.create_connection(('192.168.178.131', port), timeout=4) as probe:
            source = probe.getsockname()[0]
            result['source'] = source
            result['tcpConnected'] = True
            if ipaddress.ip_address(source) not in ipaddress.ip_network('172.24.0.0/16'):
                raise ValueError('unexpected-source-network')
        connection = http.client.HTTPConnection('192.168.178.131', port, timeout=4)
        connection.request('GET', path, headers={'Accept': 'application/json'})
        result['httpStatus'] = connection.getresponse().status
        result['passed'] = result['httpStatus'] == 200
    except (OSError, ValueError, http.client.HTTPException) as error:
        result['passed'] = False
        result['errorType'] = type(error).__name__
    finally:
        if connection is not None:
            connection.close()
    passed = passed and result['passed']
    print(json.dumps(result))
sys.exit(0 if passed else 1)
PY
```

If verification fails, remove only the matching rules actually inserted during this
execution. Do not delete a pre-existing rule, restore the entire ruleset over concurrent
changes, or change another chain. Run each deletion only if that port was newly inserted:

```bash
sudo ufw delete allow in on br-99730318335e proto tcp \
  from 172.24.0.0/16 to 192.168.178.131 port 3000 comment 'epa-001-private-bff'
sudo ufw delete allow in on br-99730318335e proto tcp \
  from 172.24.0.0/16 to 192.168.178.131 port 5555 comment 'epa-001-private-keycloak'
sudo ufw status numbered
sudo ufw show raw
```

Confirm default policies and all other rules equal the preflight snapshot, apart from
traffic counters. Record inserted/skipped rules, backup location, TCP/HTTP outcomes and any
scoped rollback. Stop after firewall verification. Successful connectivity alone will not
authorize private Playground redeployment or complete task 9.5.
