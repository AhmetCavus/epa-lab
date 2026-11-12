# Task 2.6 — Active documentation alignment

**Date:** 2026-11-12. **Scope:** documentation only, change `001-oidc-pkce`.

## Baseline and boundaries

The checkout began clean on `main`, tracking `origin/main`, at
`c76ce028b81c1687469e939205f8b07e906ee3fc`. The canonical HAPI submodule was clean on
`feat/enable-oauth` at `d609c23ae82cbd4f9cd5da26e09306b24029d131`.
OpenSpec reported `spec-driven`, `ready`, and 14/50 tasks complete, with tasks 2.1–2.5 checked.

The active documentation scan initially checked 20 documents and 109 local links, finding
37 missing targets: 32 source links under the obsolete auth-client path, its Dockerfile
link, and four nonexistent standalone `stag`/`prod` environment files. The logical profiles
remain valid: Bruno embeds `dev`/`stag`/`prod`; Postman selects `DEV_*`/`STAG_*`/`PROD_*`
defaults through `MODE`. Only `dev` has standalone environment exports.

The [repository verification record](repository-verification.md#task-25-completion--authorized-health-prerequisite-private-publication-and-lifecycle-2026-11-12)
is historical runtime evidence and is preserved unchanged. This task does not repeat image
builds, application tests or service lifecycle operations. No code, infrastructure, ADR,
environment, submodule pointer or public routing change is authorized or required here.

## Documentation corrections

- [README.md](../../../README.md): actual component tree, service/image names, verified
  infrastructure status, private integration entry point and shared-project lifecycle scope.
- [EPA.md](../../../EPA.md): canonical paths, Compose versus direct-Node environment inputs,
  existing-realm updates without a data reset, targeted stop and actual API-client exports.
- [Legacy architecture guide](../../../docs/architecture.md): canonical components, separate
  smoke/browser coverage and the verified private HAPI baseline.
- [System context](../../../docs/architecture/system-context.md): current implementation
  notes and five-service host manifest, preserving the accepted mission contracts.
- [Specification traceability](../../../docs/specifications.md): repaired source/test links,
  existing browser PKCE code exchange and explicit limits of infrastructure verification.
- [Infrastructure guide](../../../infrastructure/README.md): links to component/legacy guides
  and the existing provider/auth-client prerequisites for connectivity checks.
- [Playground guide](../../../apps/playground/README.md): host-owned routing file context;
  removed a stale current-status claim about the Traefik provider.
- [OAuth design fixture](../../../docs/design/fixtures/oauth-oidc.md): aligned its planned
  navigation with accepted `GET /api/oauth/login`, retaining the design-only label.
- [Task tracking](tasks.md): task 2.6 completion and this evidence, after validation passes.

Filesystem paths now use `services/auth-client` and `services/res-server`. Valid identifiers
such as `@epa-auth-lab/authorization`, `epa-auth-server`, `epa-authorization` collection folders,
`EPA_AUTHORIZATION_BASE_URL` and `/epa/authz/v1/send_authorization_request_fdv` remain intact.
Existing ePA/PAR functionality remains separate from the planned standard mission.

## Validation

All checks passed before marking task 2.6 complete. Validation artifacts are in
`/tmp/epa-001-task26-docs/`; expanded Compose JSON stayed in mode-0600 local files and was
not copied into documentation. No service lifecycle command was executed in this task.

The read-only Compose commands, using the existing environment, were:

```bash
docker compose version
docker compose --env-file .env -f infrastructure/docker-compose.yml --profile backend config --quiet
docker compose --env-file .env -f infrastructure/docker-compose.host.yml config --quiet
docker compose -f infrastructure/docker-compose.playground.yml config --quiet
docker compose --env-file .env -f infrastructure/docker-compose.integration.yml --profile integration config --quiet
```

**Results:** Compose 5.6.1; all four configurations pass. Resolved configurations were also
read with `config --format json` for local assertions. The actual service sets are
`auth-client`/`keycloak` (backend), all five host services, `playground` alone (UI), and
`res-server`/`res-server-db` alone (integration). The auth-client service builds
`services/auth-client/Dockerfile` as `epa-lab/auth-client:local`; HAPI uses the canonical
submodule build context. Integration assertions confirm the separate project/container/
network names, `127.0.0.1:18083:8080` publication, no database port or existing volume mount,
tmpfs database, internal database network, dedicated loopback bridge and disabled Traefik
discovery. The shutdown network names match the resolved configuration.

Documentation checks actually run:

```bash
python3 /tmp/epa-001-task26-links.py --report /tmp/epa-001-task26-docs/links-after.json
python3 /tmp/epa-001-task26-commands.py
node_modules/.bin/prettier --check README.md EPA.md docs/architecture.md docs/architecture/system-context.md docs/specifications.md infrastructure/README.md docs/design/fixtures/oauth-oidc.md openspec/changes/001-oidc-pkce/tasks.md openspec/changes/001-oidc-pkce/documentation-verification.md
node_modules/.bin/prettier --ignore-path /dev/null --check apps/playground/README.md
git diff --check
```

| Check                                        | Result                                                                                                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Local Markdown links and heading anchors     | All 155 pass across 22 active/tracking documents, including all architecture ADRs                                                             |
| Obsolete filesystem/service/image references | No active `services/epa-authorization`, `services/hapi-fhir`, obsolete build-service command or old auth-client image reference remains       |
| Referenced package commands                  | 55 references resolve to existing root/UI scripts or install commands; root backend delegation matches the unchanged package identity/scripts |
| Shell blocks                                 | All 18 shell blocks pass `bash -n`; commands are syntax-checked, not executed                                                                 |
| Compose command references                   | All 12 references name existing manifests/services; documented flags confirmed with `docker compose up/stop/rm/config --help`                 |
| API-client profiles and files                | Embedded profiles/default variables and the two actual standalone `dev` exports match the corrected instructions                              |
| Formatting and whitespace                    | Changed Markdown passes Prettier; `git diff --check` passes                                                                                   |
| Preservation                                 | All 148 baseline hashes match: tracked non-Markdown files, existing verification/readiness reports, ADRs and `.env`; HAPI HEAD/tree unchanged |

The link scan covers `README.md`, `EPA.md`, `infrastructure/README.md`,
`apps/playground/README.md`, `openspec/project.md`, all `docs/**/*.md`, and this change's
task/evidence documents. It checks local targets and Markdown fragments; external reference
URLs were not revalidated. No historical report content was scanned for current path repairs
or rewritten. Source review confirms the documented exact health exceptions/readiness probe
match the committed security configuration; no broader security acceptance is claimed.

OpenSpec commands used the already cached CLI:

```bash
npm exec --offline --yes --cache /tmp/epa-001-task24-npm-cache --package @fission-ai/openspec@1.14.1 -- openspec validate 001-oidc-pkce --strict
npm exec --offline --yes --cache /tmp/epa-001-task24-npm-cache --package @fission-ai/openspec@1.14.1 -- openspec instructions apply --change 001-oidc-pkce --json
```

Strict validation passes. Only task 2.6 is newly checked; progress is **15/50**. Tasks 6.1 and
6.4 remain unchecked, and group 3 onward is unchanged. There is no remaining blocker for
task 2.6. Stop after task 2.6; no subsequent implementation or deployment was performed.
