# Final verification — 001-oidc-pkce

Date: 2026-11-13, Europe/Berlin. Advisory verification of the approved local/private change;
no application, dependency, deployment, firewall, task checkbox or historical report was
changed. The change is not archived.

**No critical implementation issue was found. There are two warnings, one suggestion and
one explicit administrative follow-up.** The existing real persistent-runtime acceptance is
supported by its artifacts. A later host-only recreation has changed the live deployment
from that exact packet; complete browser/restart acceptance of this later state is **not
verified** here. See W1 before treating the historical deployment snapshot as current.

## Summary scorecard

| Dimension                   | Result                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Completeness                | 50/50 tracked items complete, including five retained fixture UI history items and 45 numbered tasks. Both readable delta specs contain 32 ADDED requirements; implementation evidence exists for all 32. No MODIFIED, REMOVED or RENAMED requirements.                                                                                                              |
| Correctness                 | 32/32 requirements mapped to implementation; 74/74 scenarios mapped to existing tests and dated results. Real Keycloak/HAPI and persistent browser acceptance are present. Full persistent browser/restart acceptance after the subsequent 18:07 CET recreation is **Not verified**; only read-only checks and artifact/configuration comparisons ran on that state. |
| Coherence                   | ADR-0001–0004, the single BFF/canonical HAPI boundary, capability ownership, localization and visual baseline are followed. The running HAPI lacks the approved private overlay settings (W1). No significant code-pattern deviation found.                                                                                                                          |
| Production dependency audit | Approved Node package-audit scope passes: zero production advisories; deployed BFF filesystem matches the audited image. Frontend audit also reports zero. Development findings remain separate (W2). This is not a Java-library or OS-image vulnerability audit.                                                                                                    |
| Operational verification    | Live private bindings, data-free health, anonymous FHIR denial, provider preservation and public fixtures rechecked. **Not verified:** privileged UFW ordering, duplicate counts, default-policy comparison and root-private backup integrity (O1).                                                                                                                  |

OpenSpec `spec-driven` context was loaded through `list`, `status` and `instructions apply`.
Task tracking is configured, all 50 descriptions are readable, none are unavailable and
the aggregated progress is 50 complete / 0 remaining. Planning `all_done` is not used as
proof of runtime correctness. Strict validation was independently rerun and passes with
zero issues.

Starting parent: clean `main...origin/main` at
`cfe3d79892c0a023195be66035e0acdc94605c78`. Canonical HAPI is clean at
`e65bafc279f02f44b19b47ca7326015886047a63`. The parent differs from the fresh remote checkout
used for acceptance (`dcc95ba30eb8976430968caff9ec46cfd6987ba2`) only in Markdown files;
application code, dependency graph, packaging and the HAPI gitlink are unchanged.

## Findings

### Critical

None found in the implementation, requirement/scenario mapping or checks that ran. This
does not turn the explicitly unverified checks below into passes.

### W1 — Live deployment differs from the accepted private packet

At 18:28 CET all six relevant services were healthy, but the BFF, HAPI and public SPA had
been recreated at about 18:07 CET after the recorded persistent acceptance. Container
Compose labels name only `infrastructure/docker-compose.host.yml`; the unchanged private
frontend names both the host manifest and private overlay.

| Component   | Accepted image identity                                                   | Current image identity                                                    |
| ----------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| auth-client | `sha256:6f36daf27c60c54af72b2299f3ff7008eb9d6b5b03365b8333f6ec75531fb9c9` | `sha256:09e31edb76b81d8b34d74c0a676b40a7108d4d5aff024e32509e328c55a51f7a` |
| HAPI        | `sha256:df5b73ca4de42fcdaac3090a2acaa65696a68727372f130e112d1bdaa6e6e5f5` | `sha256:ba8049c9074f35f931af8878dd6eda71b728c37bc143bfdaac81a172446a4927` |
| Public SPA  | `sha256:123ab1280bbe09df66dab4fa489d96d43cf122ee744fe5f6b22838b433a0c794` | `sha256:6226f17b300586fae1ea71149cb94c30d1bc0c231e99872b46c77d4b1277fa25` |

The private SPA still uses
`sha256:bb0bbb9590266f2b98baa93e589048b0b01328119eb14bc0c3ced52644e8944e`.
The BFF has identical filesystem layers and non-label image configuration to the accepted
image; its writable layer has no `/app` changes. HAPI's current WAR contains exactly the
same 591 file entries, each byte-identical to the task-9.4 tested WAR, including all security
classes and libraries. These comparisons support reuse of the application/security tests;
they do not establish equality of the entire HAPI image or its deployment settings.

The concrete configuration divergence is HAPI's Docker memory limit of `0` (no explicit
container limit), absent `JAVA_TOOL_OPTIONS` and absent `PLAYGROUND_DEMO_SEED`. The approved
overlay requires 4 GiB, `-Xms128m -Xmx2g` and explicit guarded seeding. An absent seed flag
does not overwrite data or bypass authentication; the initializer is conditional on `true`.
Trust settings remain nonempty, same-origin and correct, and anonymous FHIR still returns 401. No functional security failure was demonstrated by these differences.

**Recommendation:** reconcile the host deployment invocation with the approved combined
host/private manifests, especially `infrastructure/docker-compose.private.yml:3` and
`private-deployment-plan.md:80`. Before an authorized rollout, review the exact current image
identities and retained rollback prerequisites. After the intended settings are restored
or explicitly accepted, record a new persistent browser/resource/logout/restart result and
current image snapshot alongside `private-deployment-acceptance.md:25`. Do not silently
rewrite the earlier successful record. No rollout or correction was performed here.

### W2 — Development dependency advisories remain open

The task-9.4 full audit records **four moderate and one low** findings in unchanged
development tooling: `glob` 10.5.0/13.0.6, `minimatch` 9.0.9/10.2.6 and `deepmerge` 4.3.1.
Production and frontend package audits report zero. These are not production findings,
and the full development audit is not clean. No suppression or waiver is recorded.

**Recommendation:** retain the inventory in
`dependency-remediation-verification.md:55` and schedule a separate, scoped tooling
remediation with the owning test/build regressions. Relevant pins are
`pnpm-lock.yaml:1153`, `pnpm-lock.yaml:1422` and `pnpm-lock.yaml:1840`.
Do not expand the completed three-transitive production patch into unrelated upgrades.

### S1 — Retain the persistent acceptance verifier durably

`private-deployment-acceptance.md:143` references the actual persistent-browser verifier and
supporting checks under `/tmp/epa-001-task95-resume-20261113/`. They are present now, but a
fresh recursive checkout does not contain them. The checked-in
`apps/playground/tests/verify-private-runtime.mjs` verifies an isolated binding and is not
the persistent-runtime verifier. The source tests, manual startup/withdrawal instructions
and protected rollback helpers remain available; reproducibility is not wholly absent.

**Recommendation:** retain a reviewed, secret-free, target-guarded persistent verification
script in the existing test tooling or a durable versioned artifact before `/tmp` cleanup.
Keep restart/deployment actions explicit rather than adding them to an ordinary read-only
verification command. No new service or test framework is needed.

### O1 — Privileged UFW inspection remains pending

**Explicit operational finding; not independently verified by an administrator in the
available evidence.** Effective transport is independently confirmed, including renewed
requests from the actual deployed frontend. This does not prove rule ordering, absence of
duplicates, unchanged default policies or integrity of the root-private pre-change archive.

The bridge remains `br-99730318335e`, network
`99730318335e17a2b04073e4b0dd481cba8e03d3bce52f6ba5a05273c61da859`, subnet
`172.24.0.0/16`. The approved tuples allow TCP from that interface/subnet to
`192.168.178.131:3000` and `:5555`. The administrator audit records the two matching insert
commands and the backup invocation for `/root/ufw-backups/ufw-20261113-171331.tgz`;
it does not include their terminal results or archive contents. Earlier noninteractive
sudo checks require interactive authentication. No privileged retry or firewall mutation
was attempted during this final verification.

**Administrator follow-up:** capture `ufw status numbered`, `ufw show raw` and the applicable
INPUT/UFW chains; confirm effective ordering and exactly the intended tuple counts; compare
default policies against the pre-change backup; validate the protected archive with
`gzip -t` and `tar -tzf` and inspect its expected configuration contents. Retain that evidence
privately and append a dated result to `firewall-verification.md:91`. Do not reinsert rules
merely to repeat verification. Existing Keycloak's `0.0.0.0:5555` publication is unchanged;
this report does not claim an independent external-WAN firewall audit.

## Evidence used and applicability

Existing results are reused as requested; entire passing suites were not rerun. Source
inspection and application-artifact comparisons establish their applicability to this
checkout. Historical failures, blocked stages and later successful results remain distinct.

| Evidence                                                                                                                                                                | Verified result used                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Keycloak setup](keycloak-verification.md)                                                                                                                              | Separate confidential standard client, S256 without PAR, permission/audience, missing/invalid PKCE rejection, fresh realm setup, repeated idempotent migration and existing ePA PAR preservation.                                                                                                  |
| [Profiles](auth-client-profiles-verification.md), [browser lifecycle](browser-lifecycle-verification.md)                                                                | Fixed server-selected profiles, profile-specific discovery, transaction-bound exchange/validation, bounded storage, cookie isolation, one-time callbacks, expiry/restart and logout cancellation.                                                                                                  |
| [HAPI security and pin](resource-server-verification.md)                                                                                                                | Trusted decoder, signed-JWT negatives, deny-by-default servlet policy, guarded synthetic initialization, safe reports, reviewed canonical commit and recursive checkout.                                                                                                                           |
| [Resource observations](resource-observability-verification.md)                                                                                                         | Fixed upstream read, typed schema-1 observations, ownership, capacity/reservations, honest observer/reporter semantics and disclosure tests.                                                                                                                                                       |
| [SPA and visual acceptance](spa-runtime-verification.md)                                                                                                                | 91 browser/contract/architecture/localization/accessibility tests; both locales at 1366/1024/390/320 CSS px; keyboard/focus/reduced motion; native 100%/200% zoom and visual comparison.                                                                                                           |
| [Integrated acceptance](integrated-acceptance-verification.md), superseded only for remediated dependencies by [patch evidence](dependency-remediation-verification.md) | Final 403 NestJS unit/HTTP tests; 44 real provider/resource integration tests; 107 direct Keycloak/HAPI assertions; 122 focused Gradle tests and 62 real servlet/JPA cases; 91 SPA tests; typecheck/build/lint/format and disclosure checks. No failure or skip in the reported final scoped runs. |
| [Persistent acceptance](private-deployment-acceptance.md)                                                                                                               | Actual deployed port-5173 journey, no temporary BFF/Vite or browser proxy; real login/303/reload/resource/Inspector/logout/history, two restart cases, network checks, six real ePA regressions and exercised targeted rollback. W1 qualifies its use as the current deployment snapshot.          |
| [Approved deployment packet](private-deployment-plan.md), [firewall record](firewall-verification.md)                                                                   | Owner-approved exact changes, private-only binding, backups, target-specific lifecycle and administrator follow-up.                                                                                                                                                                                |

The 44 real NestJS integrations comprise 29 standard lifecycle/negative cases, nine profile
cases and six legacy Keycloak/ePA cases. Signed test JWTs are used for independent negative
cryptographic cases in the actual validator/filter chain; they do not replace required
real Keycloak/HAPI acceptance. UI DTO fixtures test presentation/error states separately
from the actual provider/resource browser journey.

The dated final persistent artifacts are present and agree with the report:
`persistent-browser.json` is verified; its synthetic read is 200, post-logout resource is
401, history has 14 owned events, old-cookie/cross-browser rejection passes and fresh login
after BFF restart succeeds. Actual deployed frontend and HAPI-network-namespace checks
returned 200 for BFF/JWKS. These are final-pass artifacts, not the earlier failed rollouts.

## Architecture, security and UX assessment

The BFF remains the OAuth client. The SPA consumes fixed same-origin cookie APIs; Keycloak
is the AS/IdP; canonical HAPI independently validates Access Tokens. There is no second BFF,
Resource Server, generic provider/plugin framework or arbitrary upstream proxy.

Transactions fix profile, issuer, client, callback, state, nonce and S256 material. The
standard path constructs direct authorization; the ePA path still calls PAR. The store
consumes a transaction before asynchronous exchange and checks current eligibility again
before commit. Logout rotates ownership, cancels preparing/pending/in-flight attempts and
removes credentials independently of event recording. Bounds remain ten minutes for pending
transactions, fifteen minutes for contexts/runs, 1000 entries per collection and 100 events
per run. Rotation does not extend viewing lifetime; a full trace fails before upstream work
and is marked incomplete instead of silently truncated.

HAPI pins RS256/trusted JWKS, issuer, `playground-fhir` audience, expiry/nbf and Access Token
purpose. Missing/invalid/ID/ePA tokens fail authentication; missing `demo.fhir.read` fails
authorization. Only exact GET of `Basic/playground-demo` without query is permitted. Other
methods, resources, operations, encodings and alternate interfaces are denied. Only exact
GET/HEAD data-free liveness/readiness bypass authentication. Signed-token servlet/JPA tests
exercise these boundaries and no provider-internal observation is inferred.

Schema-1 event producer and consumer schemas are strict per kind. Observer/time/sequence
are generated at BFF boundaries. Only the defined, status-consistent HAPI headers become a
separate reported decision; missing/invalid reports are unavailable. Local BFF rejection
has no fabricated HAPI call/denial. Tokens, codes, nonce/state/verifiers, client secrets,
cookies, identity claims, callbacks and full bodies are excluded from learning evidence and
routine diagnostics. The context-bound anti-CSRF response is an explicit API contract,
not a bearer token or Inspector field.

ADR-0003 ownership is preserved: mission owns execution and wire validation; protocol-flow
renders neutral observed/fixture/conceptual events through public contracts. Selection,
language changes, Replay explanation and Reset view do not execute protocol operations.
German remains default/fallback, English is supported, only explicit locale choice persists
and technical evidence is rendered literally.

Both reference PNGs, the retained actual authorized Workspace screenshot and the renewed
public catalog screenshot were inspected in this verification. Layout hierarchy, dark
navy/cyan surfaces, objectives, actor map, Inspector and timeline remain recognizable.
Existing native-zoom JSON confirms actual browser readbacks 1 and 2 in both locales, with
constant outer width 1366, inner widths 1366/683, DPR 1/2 and no CSS zoom. This is distinct
from merely resizing a viewport. The approved packet intentionally retains the existing
private integration-test entry/labels and public fixture/Planned cards; this report does
not reinterpret that accepted constraint as permission for a UI availability-label rewrite.

## Reproducibility, rollback and dependency scope

Fresh remote recursive checkout of `dcc95ba30eb8976430968caff9ec46cfd6987ba2` resolved canonical
HAPI `e65bafc279f02f44b19b47ca7326015886047a63`, with clean worktrees, no URL substitution or
object alternates and 172 identical non-Markdown tracked files. The previous Git publication
blocker is resolved. Current HEAD adds only Markdown changes to that source baseline.

The approved combined Compose startup and frontend stop/start commands are documented in
`private-deployment-acceptance.md:57` and `private-deployment-acceptance.md:190`. Full
withdrawal/reapply helpers remain under the ignored mode-0700 directory
`.local-backups/001-oidc-pkce/task-9.5-20261113-dcc95ba3/`, with mode-0600 files. All seven
retained backup files match their original snapshots; both lifecycle helpers pass
`node --check`. Their exact reviewed backend image IDs still exist. The historical public
image ID is no longer locally available, but public-image restoration is not part of the
approved targeted rollback. No reset/recreation of databases or volumes is required.

The targeted rollback sequence was actually exercised before final acceptance. Its durable
copies were syntax-checked, not executed during this read-only verification. Their behavior
is to remove only the private frontend, disable the standard mission, restore its callback,
retain corrected JWKS/patched backend images and preserve the approved synthetic database
resource. W1 requires reassessing the live baseline before another authorized invocation;
these host-specific private snapshots are not a portable fresh-host secret distribution.

The production graph resolves body-parser 2.4.0, Multer 2.5.0 and QS 6.16.1; Zod remains
4.6.6 and NestJS remains 11.2.7. Recorded task-9.4 production/full/frontend audit JSON is
present: production zero, frontend zero, full development four moderate/one low. The actual
accepted BFF production graph also audits zero; the current BFF's identical filesystem makes
that package evidence applicable. No new registry query or dependency upgrade was needed
for this unchanged graph. Zero is scoped to those dated Node application-package audits;
it is not a claim about all OS packages, Java dependencies or undiscovered vulnerabilities.

## Additional checks run in this verification

Only gaps introduced by the live snapshot difference were expanded. Safe new artifacts are
under `/tmp/epa-001-final-verification-20261113/`; renewed public screenshots/results are
under `apps/playground/.cache/final-verification/public/`. Protected credentials/backups
were neither printed nor copied into this report.

| Check / command                                                                                                                              | Result                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `git status --short --branch`, parent/submodule `rev-parse`, source diff from accepted remote checkout                                       | Clean starting tree; canonical HAPI pin; only Markdown parent differences.                                                                                                                                               |
| OpenSpec 1.14.1 `list --json`, `status --change 001-oidc-pkce --json`, `instructions apply --change 001-oidc-pkce --json`                    | Existing root; complete readable planning inputs; 50/50 tracked items.                                                                                                                                                   |
| OpenSpec `validate 001-oidc-pkce --strict --json` using existing offline CLI cache                                                           | Pass, zero issues.                                                                                                                                                                                                       |
| Filtered `docker inspect`, `docker image inspect`, `docker network inspect`; in-memory comparison with merged Compose JSON                   | All six healthy; private bindings intact; image/overlay differences precisely identified as W1; no secrets emitted.                                                                                                      |
| `docker diff epa-lab-auth-client`; `docker cp epa-lab-res-server:/app/main.war` to private temporary directory; per-entry SHA-256 comparison | No BFF `/app` writes; identical BFF layers/non-label config; all 591 HAPI WAR file entries match the tested WAR.                                                                                                         |
| `node /tmp/epa-001-final-verification-20261113/verify-current-provider.mjs`                                                                  | Approved environment unchanged; standard policy/callback/scopes correct; other clients/users/mappings/ePA PAR digest preserved; BFF readiness 200, anonymous FHIR 401, private anonymous session 200. No realm mutation. |
| Existing `verify-public-fixtures.mjs` executed unchanged except separate artifact-output directory                                           | Pass: German default, English, fixture OAuth, conceptual ePA; zero forbidden requests/browser errors; no real authentication action offered.                                                                             |
| Actual deployed frontend `docker exec ... node` credential-free BFF/JWKS HTTP checks                                                         | Both 200 from `172.24.0.5`; affected bridge identity/subnet unchanged.                                                                                                                                                   |
| Direct HAPI GET/HEAD liveness/readiness                                                                                                      | All four 200, status-only GET and empty HEAD.                                                                                                                                                                            |
| Deployed public Nginx comparison and credential-free Node HTTP requests                                                                      | Exact fixture config, no OAuth proxy; `/missions` and `/api/oauth/session` return identical HTML, no cookies.                                                                                                            |
| Durable backup byte/mode checks, `git check-ignore`, lifecycle helper `node --check`                                                         | Pass; seven backup files match retained originals, protected directory/files and helper syntax intact. This is separate from inaccessible UFW backup integrity.                                                          |

The first Python default-opener health request returned 403 and its later explicit-direct
public transport attempt was unusable. Explicit-direct health checks and the accepted
Node/browser clients establish the successful results above. The Python attempt is not
reported as a successful public check or used to infer a HAPI security failure; no TLS or
application validation was disabled to obtain the Node/browser results. Historical evidence
was not overwritten by these new checks.

Report validation passes: formatting, 38 local links and an exact ordered comparison of
all 74 named scenario rows against the approved specs. The six inspected live containers
retain their IDs, images and start times throughout this verification and remain healthy.
The only repository addition is this report; the canonical submodule remains clean.

Not rerun: entire already-passing NestJS/Gradle/SPA suites or a new authenticated browser
journey; their existing results were reused as requested. Restart/recovery and rollback
were not repeated because they would modify the deployment under verification. The
unrelated upstream HAPI functional suite is
outside the approved narrow exercise and is not claimed to pass. Privileged UFW inspection
remains unverified; no archive-readiness claim is made.

## Requirement and scenario mapping

The following index covers every named requirement and all 74 scenarios from the two
approved delta specs. IDs A/M below are report-local references, not new OpenSpec task IDs.
“Covered” means implementation was located, corresponding tests were inspected and passing
results are recorded in the evidence above. It does not mean each suite ran again in this
verification. W1 qualifies the current deployment comparison, not the existence of those
tests or the historical successful acceptance.

Implementation roots: **B** = `services/auth-client/src`; **S** =
`apps/playground/src`; **H** =
`services/res-server/src/main/java/ca/uhn/fhir/jpa/starter`. File suffixes after `:` are
line references. Test aliases below resolve to the canonical source files. **PB** means
the actual persistent acceptance report and `persistent-browser.json`, not the isolated
browser harness. **HAPI** includes the 107 real-provider assertions recorded at acceptance.

### Test source index

| Alias     | Source                                                                                                                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTP      | [services/auth-client/test/standard-browser.http.spec.ts](../../../services/auth-client/test/standard-browser.http.spec.ts)                                                                                                           |
| BR        | [services/auth-client/test/standard-browser.integration.ts](../../../services/auth-client/test/standard-browser.integration.ts)                                                                                                       |
| STORE     | [services/auth-client/src/authorization/standard-login/standard-browser-state.spec.ts](../../../services/auth-client/src/authorization/standard-login/standard-browser-state.spec.ts)                                                 |
| P         | [services/auth-client/test/profiles.integration.ts](../../../services/auth-client/test/profiles.integration.ts)                                                                                                                       |
| TOKEN     | [services/auth-client/src/oidc/profile-token.service.spec.ts](../../../services/auth-client/src/oidc/profile-token.service.spec.ts)                                                                                                   |
| DISC      | [services/auth-client/src/oidc/oidc-discovery.service.spec.ts](../../../services/auth-client/src/oidc/oidc-discovery.service.spec.ts)                                                                                                 |
| EPA       | [services/auth-client/test/keycloak.integration.ts](../../../services/auth-client/test/keycloak.integration.ts)                                                                                                                       |
| LEGACY    | [services/auth-client/test/browser-login.http.spec.ts](../../../services/auth-client/test/browser-login.http.spec.ts)                                                                                                                 |
| KC        | [infrastructure/keycloak/run-verification.mjs](../../../infrastructure/keycloak/run-verification.mjs)                                                                                                                                 |
| RESOURCE  | [services/auth-client/src/authorization/standard-resource/standard-resource.spec.ts](../../../services/auth-client/src/authorization/standard-resource/standard-resource.spec.ts)                                                     |
| REPORT    | [services/auth-client/src/authorization/standard-resource/resource-report.spec.ts](../../../services/auth-client/src/authorization/standard-resource/resource-report.spec.ts)                                                         |
| EVENT     | [services/auth-client/src/authorization/run-observations/protocol-event.spec.ts](../../../services/auth-client/src/authorization/run-observations/protocol-event.spec.ts)                                                             |
| RS        | [services/res-server/src/test/java/ca/uhn/fhir/jpa/starter/security/PlaygroundResourceSecurityTest.java](../../../services/res-server/src/test/java/ca/uhn/fhir/jpa/starter/security/PlaygroundResourceSecurityTest.java)             |
| RSIT      | [services/res-server/src/test/java/ca/uhn/fhir/jpa/starter/security/PlaygroundResourceSecurityIT.java](../../../services/res-server/src/test/java/ca/uhn/fhir/jpa/starter/security/PlaygroundResourceSecurityIT.java)                 |
| HEALTH    | [services/res-server/src/test/java/ca/uhn/fhir/jpa/starter/security/HealthProbeSecurityConfigurationTest.java](../../../services/res-server/src/test/java/ca/uhn/fhir/jpa/starter/security/HealthProbeSecurityConfigurationTest.java) |
| HAPI      | [services/res-server/scripts/verify-private-security.mjs](../../../services/res-server/scripts/verify-private-security.mjs)                                                                                                           |
| UI        | [apps/playground/tests/oauth-runtime.spec.ts](../../../apps/playground/tests/oauth-runtime.spec.ts)                                                                                                                                   |
| ADAPTER   | [apps/playground/tests/oauth-adapter.spec.ts](../../../apps/playground/tests/oauth-adapter.spec.ts)                                                                                                                                   |
| FIXTURE   | [apps/playground/tests/mission-experience.spec.ts](../../../apps/playground/tests/mission-experience.spec.ts)                                                                                                                         |
| DESIGN    | [apps/playground/tests/design-foundation.spec.ts](../../../apps/playground/tests/design-foundation.spec.ts)                                                                                                                           |
| VISUAL    | [apps/playground/tests/oauth-visual.spec.ts](../../../apps/playground/tests/oauth-visual.spec.ts)                                                                                                                                     |
| LOCALE    | [apps/playground/tests/localization.spec.ts](../../../apps/playground/tests/localization.spec.ts)                                                                                                                                     |
| RESOURCES | [apps/playground/tests/localization-resources.spec.ts](../../../apps/playground/tests/localization-resources.spec.ts)                                                                                                                 |
| ARCH      | [apps/playground/tests/architecture.spec.ts](../../../apps/playground/tests/architecture.spec.ts)                                                                                                                                     |
| PUBLIC    | [apps/playground/tests/verify-public-fixtures.mjs](../../../apps/playground/tests/verify-public-fixtures.mjs)                                                                                                                         |

### authorization-flow

Source: [approved delta](specs/authorization-flow/spec.md). All requirements are ADDED.

| ID  | Requirement                                                  | Implementation                                                                                                                                                                                 | Scenarios   |
| --- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| A01 | Start a correlated real authorization request                | `B/authorization/authorization.service.ts:69`; `B/oidc/authorization-transaction.ts:26`; `B/oidc/oidc-discovery.service.ts:87`                                                                 | 3/3 covered |
| A02 | Preserve the existing ePA and PAR behavior                   | `B/authorization/authorization.service.ts:23`; `B/authorization/browser-login/browser-login.controller.ts:23`                                                                                  | 3/3 covered |
| A03 | Bind callbacks to the originating browser and client profile | `B/authorization/standard-login/standard-browser.controller.ts:124`; `B/authorization/standard-login/standard-browser-state.ts:193`                                                            | 4/4 covered |
| A04 | Consume a valid transaction once                             | `B/authorization/standard-login/standard-browser-state.ts:193`; `B/authorization/standard-login/standard-browser.service.ts:175`                                                               | 2/2 covered |
| A05 | Complete only after valid callback and OIDC validation       | `B/oidc/token.service.ts:43`; `B/oidc/id-token.service.ts:80`; `B/authorization/standard-login/standard-browser-state.ts:255`                                                                  | 4/4 covered |
| A06 | Return to the fixed Mission Control route                    | `B/authorization/standard-login/standard-browser.controller.ts:41`; `B/authorization/standard-login/standard-browser.service.ts:141`                                                           | 2/2 covered |
| A07 | Expose a minimal cookie-based application session            | `B/authorization/standard-login/standard-browser-state.ts:317`; `B/authorization/standard-login/standard-browser.controller.ts:98`                                                             | 3/3 covered |
| A08 | Protected API uses Access Token authorization                | `B/authorization/standard-login/standard-browser.service.ts:327`; `B/authorization/standard-resource/standard-resource.ts:43`                                                                  | 3/3 covered |
| A09 | Resource Server independently validates bearer credentials   | `H/security/PlaygroundJwtConfiguration.java:27`; `H/security/ResourceServerTrustProperties.java:12`                                                                                            | 2/2 covered |
| A10 | Resource Server authorizes only the declared exercise        | `H/security/PlaygroundResourceSecurityConfiguration.java:29`; `H/security/HealthProbeSecurityConfiguration.java:25`; `H/demo/PlaygroundDemoResourceConfiguration.java:21`                      | 3/3 covered |
| A11 | Application sign-out prevents subsequent access              | `B/authorization/standard-login/standard-browser.service.ts:454`; `B/authorization/standard-login/standard-browser-state.ts:289`                                                               | 2/2 covered |
| A12 | Prevent stale callbacks after logout                         | `B/authorization/standard-login/standard-browser-state.ts:255`; `B/authorization/standard-login/standard-browser-state.ts:468`; `B/authorization/standard-login/standard-browser-state.ts:503` | 2/2 covered |
| A13 | Authentication cleanup is independent of event persistence   | `B/authorization/standard-login/standard-browser-state.ts:289`; `B/authorization/standard-login/standard-browser-state.ts:396`                                                                 | 1/1 covered |
| A14 | Protect local logout against cross-site requests             | `B/authorization/standard-login/standard-browser.service.ts:454`; `B/authorization/standard-login/standard-browser-state.ts:289`                                                               | 1/1 covered |
| A15 | Protocol traces contain no secrets                           | `B/authorization/run-observations/protocol-event.ts:43`; `B/common/logging/request-logging.ts:7`; `B/common/errors/authorization-error.filter.ts:9`                                            | 1/1 covered |

| Scenario | Approved scenario                                               | Evidence inspected; passing result recorded                                                                |
| -------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| A01.1    | Starting the standard mission without PAR                       | P:315; PB (actual direct Code/S256, zero standard PAR)                                                     |
| A01.2    | Starting again creates another transaction                      | HTTP:835; UI:129; STORE:152 (fresh identities)                                                             |
| A01.3    | Standard discovery does not require PAR metadata                | DISC:34 (standard accepts absent PAR; ePA rejects it)                                                      |
| A02.1    | Header-based smoke operation remains stateless                  | EPA; LEGACY (stateless header/PAR and request-ID contracts)                                                |
| A02.2    | Existing ePA browser demonstration still completes              | EPA:143; LEGACY (real browser callback and legacy session)                                                 |
| A02.3    | Standard configuration does not weaken the PAR policy           | KC; P:347 (standard direct authorization, ePA PAR bypass denied)                                           |
| A03.1    | Missing or different browser binding                            | BR:776; HTTP:946; STORE:58 (missing/wrong/browser cookies)                                                 |
| A03.2    | Untracked, expired, or lost transaction                         | BR:1031; BR:1076; HTTP:1012 (expiry, unknown state, context loss)                                          |
| A03.3    | Login and callback use different application hosts or instances | BR:776; BR:1076; HTTP:946 (host/instance rejection)                                                        |
| A03.4    | Standard and ePA contexts cannot be substituted                 | P:336; P:354; HTTP:970; TOKEN:152 (profile/client/route substitution)                                      |
| A04.1    | Replaying or racing a callback                                  | BR:889; HTTP:1105 (one exchange under race; replay denied)                                                 |
| A04.2    | Exchange or validation fails after consumption                  | HTTP:749; HTTP:980; TOKEN:322 (consumption survives exchange/validation failure)                           |
| A05.1    | Completing a valid standard transaction                         | BR:429; PB; P:315 (actual exchange, validation, cookie rotation)                                           |
| A05.2    | Rejecting malformed or unsuccessful provider responses          | BR:776; BR:856; HTTP:910 (strict callback shape and provider denial)                                       |
| A05.3    | Rejecting failed PKCE or an unusable code                       | P:364; P:379; P:386; KC (real wrong PKCE, reused and expired codes)                                        |
| A05.4    | Rejecting invalid token evidence                                | TOKEN:209; TOKEN:252; TOKEN:277; BR:945 (individually signed invalid claims/keys/signatures)               |
| A06.1    | Successful or correlated failed callback returns to Workspace   | HTTP:869; HTTP:980; PB (successful/correlated failed clean 303)                                            |
| A06.2    | Rejecting caller-selected destinations and client settings      | HTTP:900; HTTP:970; BR:776 (caller-controlled destinations/profile refused)                                |
| A07.1    | Reading the standard session                                    | BR:429; HTTP:869 (minimal session/reload, no-store/no identity claims)                                     |
| A07.2    | Authentication expires                                          | BR:1031; STORE:110; UI:314 (expiry removes server-held authentication)                                     |
| A07.3    | Session cookies are isolated and inaccessible to scripts        | HTTP:835; HTTP:1238; LEGACY (HttpOnly/path/SameSite/Secure and ePA isolation)                              |
| A08.1    | Reading the synthetic resource through the BFF                  | BR:560; PB; HAPI (actual server-held AT, fixed synthetic read)                                             |
| A08.2    | Requesting a resource without application authentication        | HTTP:457; BR:484 (anonymous/expired/ePA-only/signed-out do not call HAPI)                                  |
| A08.3    | Preventing an arbitrary resource proxy                          | HTTP:486; HTTP:498; RESOURCE (destinations, credentials, body, method refused)                             |
| A09.1    | Accepting a valid resource Access Token                         | RS:68; RSIT:110; HAPI (valid signed Access Token, exact audience)                                          |
| A09.2    | Rejecting invalid bearer credentials directly                   | RS:79; RS:110; RSIT:134; HAPI (all listed invalid-token classes independently rejected)                    |
| A10.1    | Denying a token without permission                              | RS:124; RSIT:126; BR:639; HAPI (valid narrower token gets 403)                                             |
| A10.2    | Denying operations outside the exercise                         | RS:134; RS:176; RSIT:158; RSIT:199; RSIT:212 (methods/resources/query/batch/alternative interfaces denied) |
| A10.3    | Health checks expose no protected data                          | HEALTH:70; HEALTH:104; HEALTH:117; RSIT:233; current health probes (only data-free GET/HEAD exceptions)    |
| A11.1    | Local logout invalidates application authentication             | BR:484; HTTP:1067; PB (old cookie and next resource request rejected)                                      |
| A11.2    | Provider SSO remains independent                                | BR:484; PB restart recovery (provider SSO remains independent of local logout)                             |
| A12.1    | Rejecting a pending transaction cancelled by logout             | BR:1117; HTTP:1159; HTTP:1178 (pending/preparing callbacks cancelled)                                      |
| A12.2    | Logout during an in-flight callback                             | BR:912; HTTP:1124 (logout during actual call-through exchange and validation, no commit)                   |
| A13.1    | Exhausted event storage during logout                           | BR:1117; BR:1159; HTTP:1206; STORE:185 (full/throwing recorder cannot prevent cleanup)                     |
| A14.1    | Rejecting unsafe logout requests                                | BR:991; HTTP:1044; HTTP:1092 (exact Origin/CSRF, foreign context and GET rejection)                        |
| A15.1    | Inspecting successful and failed flows                          | EVENT; HTTP:817; RSIT:243; PB; disclosure scans (actual secret sentinels, successes/failures)              |

### mission-experience

Source: [approved delta](specs/mission-experience/spec.md). All requirements are ADDED.

| ID  | Requirement                                                   | Implementation                                                                                                                                                                         | Scenarios   |
| --- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| M01 | Fixture catalog and routing                                   | `S/app/runtime.ts:6`; `S/features/mission/application/mission-catalog.ts:10`; `S/features/mission/ui/Catalog.tsx:113`                                                                  | 2/2 covered |
| M02 | Independent learning and fixture selection                    | `S/features/mission/application/useMissionWorkspace.ts:25`                                                                                                                             | 1/1 covered |
| M03 | Honest samples and safe inspection                            | `S/features/mission/application/useMissionWorkspace.ts:13`; `S/features/mission/application/useMissionWorkspace.ts:30`; `S/features/protocol-flow/ui/Inspector.tsx:22`                 | 2/2 covered |
| M04 | Preserve the Mission Control visual contract                  | `S/features/mission/ui/Workspace.tsx:8`; `S/features/protocol-flow/ui/Inspector.tsx:42`                                                                                                | 1/1 covered |
| M05 | Responsive accessible interaction                             | `S/features/protocol-flow/ui/Inspector.tsx:42`; `S/features/protocol-flow/ui/Timeline.tsx:19`; `S/features/mission/ui/Workspace.tsx:66`                                                | 2/2 covered |
| M06 | A visitor can select a real available mission                 | `S/app/runtime.ts:6`; `S/features/mission/application/mission-catalog.ts:10`; `S/features/mission/ui/Catalog.tsx:152`                                                                  | 2/2 covered |
| M07 | The workspace is not OAuth-specific                           | `S/features/mission/application/useMissionWorkspace.ts:8`; `S/features/protocol-flow/domain/protocol-flow.ts:39`                                                                       | 1/1 covered |
| M08 | Browser redirects do not fake a stepped debugger              | `S/features/mission/application/useOAuthMission.ts:170`; `S/features/mission/data/oauth-presentation.ts:54`; `B/authorization/standard-login/standard-browser.service.ts:100`          | 2/2 covered |
| M09 | Restore the current run after callback navigation             | `S/features/mission/application/useOAuthMission.ts:71`; `S/features/mission/application/useOAuthMission.ts:108`                                                                        | 3/3 covered |
| M10 | Serve only browser-owned run evidence                         | `B/authorization/standard-login/standard-browser-state.ts:317`; `B/authorization/standard-login/standard-browser-state.ts:423`                                                         | 3/3 covered |
| M11 | Bound run retention and event collections                     | `B/authorization/standard-login/standard-browser-state.ts:368`; `B/authorization/standard-login/standard-browser-state.ts:529`; `S/features/mission/application/useOAuthMission.ts:71` | 3/3 covered |
| M12 | Use a versioned typed safe event contract                     | `B/authorization/run-observations/protocol-event.ts:43`; `S/features/mission/data/oauth-contract.ts:44`; `S/features/mission/data/oauth-api.ts:128`                                    | 3/3 covered |
| M13 | Evidence is not confused with explanation                     | `B/authorization/standard-resource/resource-report.ts:8`; `S/features/mission/data/oauth-presentation.ts:33`; `S/features/protocol-flow/ui/Inspector.tsx:66`                           | 5/5 covered |
| M14 | States have useful recovery                                   | `S/features/mission/application/useOAuthMission.ts:108`; `S/features/mission/application/useOAuthMission.ts:183`; `S/features/mission/application/useOAuthMission.ts:243`              | 3/3 covered |
| M15 | Recovery and learning commands have distinct effects          | `S/features/mission/application/useMissionWorkspace.ts:35`; `S/features/mission/application/useOAuthMission.ts:222`                                                                    | 2/2 covered |
| M16 | Localize runtime presentation without changing protocol state | `S/app/i18n.ts:13`; `S/app/i18n.ts:45`; `S/features/mission/data/oauth-presentation.ts:22`                                                                                             | 2/2 covered |
| M17 | Keep sensitive data out of the learning surface               | `S/features/mission/data/oauth-contract.ts:73`; `S/features/mission/data/oauth-presentation.ts:22`; `S/features/protocol-flow/ui/Inspector.tsx:104`                                    | 1/1 covered |

| Scenario | Approved scenario                                       | Evidence inspected; passing result recorded                                                            |
| -------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| M01.1    | Catalog and routing in fixture mode                     | FIXTURE:9; FIXTURE:117 (catalog previews/direct URLs/navigation)                                       |
| M01.2    | Existing public deployment stays fixture-only           | PUBLIC (renewed real public browser and static API fallback check)                                     |
| M02.1    | Selecting learning content                              | FIXTURE:38; UI:97 (learning selection independent of execution)                                        |
| M03.1    | Loading and inspecting fixture samples                  | FIXTURE:38; DESIGN:9 (explicit samples, fixture provenance and selection)                              |
| M03.2    | Keeping samples separate from a real run                | UI:361; UI:97 (fixture samples separated from real run)                                                |
| M04.1    | Rendering runtime states in the existing design         | VISUAL:86; retained screenshot comparison and visual inspection (approved hierarchy/artwork)           |
| M05.1    | Navigating at narrow widths and browser zoom            | VISUAL:29; VISUAL:143; LOCALE:235 (both locales, all specified widths, actual 100/200% zoom)           |
| M05.2    | Keyboard and reduced-motion operation                   | VISUAL:29; DESIGN:9; FIXTURE:149 (keyboard, focus, reduced motion, text alternative)                   |
| M06.1    | Selecting an enabled verified mission                   | PB; UI:129; ADAPTER:327 (enabled private entry to actual verified execution; approved labels retained) |
| M06.2    | Runtime is absent or unavailable                        | ADAPTER:327; UI:264; PUBLIC (no execution when absent, safe unavailable recovery)                      |
| M07.1    | Rendering both mission families                         | ARCH; FIXTURE:117; UI:361 (neutral renderer and conceptual ePA isolation)                              |
| M08.1    | Leaving for the provider                                | UI:129; PB (normal top-level redirect, no fake provider debugger)                                      |
| M08.2    | Front-channel evidence records only what the BFF sees   | HTTP:339; UI:50; EVENT (BFF redirect issuance/callback receipt only)                                   |
| M09.1    | Returning from a completed callback                     | PB; BR:429; UI:50 (current owned run after real return)                                                |
| M09.2    | Refreshing an eligible runtime run                      | PB; UI:97 (same IDs, no repeated login/resource operations)                                            |
| M09.3    | Missing, expired, or lost context                       | UI:264; UI:290; UI:314; BR:1076 (missing/expired/restarted context recovery)                           |
| M10.1    | Rejecting another browser's run request                 | BR:991; HTTP:509 (second browser gets 404)                                                             |
| M10.2    | Rejecting a run ID without viewing ownership            | HTTP:509; BR:484 (run ID alone/old cookie cannot authorize history)                                    |
| M10.3    | Viewing safe history after local logout                 | PB; BR:560; HTTP:1067 (rotated owner sees bounded safe history)                                        |
| M11.1    | Expired history cannot be recovered                     | BR:1031; STORE:73; UI:314 (original history lifetime, no revival/extension)                            |
| M11.2    | Capacity is reached                                     | STORE:160; STORE:226; HTTP:626; BR:1117 (1000-entry/100-event limits and reservation before work)      |
| M11.3    | Reflecting logout when its observation cannot be stored | UI:212; HTTP:675; BR:1159 (authoritative logout retained, missing event not invented)                  |
| M12.1    | Reading a supported event document                      | EVENT; ADAPTER:28 (version-1 strict producer/consumer compatibility)                                   |
| M12.2    | Keeping observation identity and order stable           | HTTP:339; BR:560; PB; ADAPTER:184 (stable IDs/order/observer/time)                                     |
| M12.3    | Rejecting unsupported or unsafe event data              | HTTP:800; ADAPTER:172; ADAPTER:184; UI:245 (unknown/unsafe schema fails, no raw fallback)              |
| M13.1    | Inspecting a BFF observation                            | UI:50; PB (actual BFF observer/timestamp/outcome)                                                      |
| M13.2    | Showing an explicitly reported Resource Server decision | HTTP:374; PB; UI:50 (separate explicit res-server report)                                              |
| M13.3    | Resource Server reason is unavailable                   | HTTP:437; REPORT; UI:177 (missing/invalid reason unavailable)                                          |
| M13.4    | Provider-internal explanation stays unobservable        | DESIGN:96; UI:50; UI:361; ARCH (provider-internal explanation has no observed trace)                   |
| M13.5    | BFF denial is not a Resource Server denial              | HTTP:457; PB; UI:212 (local BFF rejection cannot become HAPI denial)                                   |
| M14.1    | Recovering from failed or cancelled login               | UI:290; UI:314; BR:856 (failure/cancellation, fresh retry, no guessed success)                         |
| M14.2    | Resource access fails after successful login            | UI:149; UI:177; BR:639; BR:669 (resource denial separate from authentication)                          |
| M14.3    | Session restoration is pending                          | UI:50; UI:290 (restoring phase, unavailable observations, no fabricated progression)                   |
| M15.1    | Replaying or resetting does not execute                 | UI:97; FIXTURE:38 (Replay/Reset/checkpoints do not execute protocol work)                              |
| M15.2    | Signing out keeps eligible safe inspection              | UI:189; UI:212; PB (logout removes capability, retains eligible inspection)                            |
| M16.1    | Rendering both supported languages                      | LOCALE:38; RESOURCES:104; VISUAL (German default/fallback and English, literal technical values)       |
| M16.2    | Changing language during inspection                     | LOCALE:133; UI:97; PB (navigation/run/event/selection retained on locale change)                       |
| M17.1    | Inspecting runtime and fixture evidence                 | ADAPTER:172; UI:264; RESOURCES:207; PB; disclosure scans (no secret/body/identity fallback)            |

## Final assessment

No critical issues found in the checks that ran. **Two warnings** concern deployment
drift and development-only advisories; **one suggestion** concerns durable retention of
the persistent acceptance verifier. All 50 tracked items, 32 requirements and 74 scenarios
have implementation/test evidence. Existing real persistent acceptance remains a valid
dated result, with current identical application artifacts and renewed read-only checks.

**Not verified:** complete browser/restart acceptance of the later host-only recreation;
privileged UFW ordering, duplicate counts, default-policy comparison and root-private backup
integrity. These limits are not silently treated as passes or new task IDs. This advisory
verification does not make a blanket archive-readiness claim. Application/deployment remain
unchanged; no task was reopened or newly marked complete, and the change is not archived.
