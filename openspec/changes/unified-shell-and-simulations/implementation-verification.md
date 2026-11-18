# Unified shell and simulations — implementation verification

The owner explicitly authorized all 22 tasks through `openspec-apply-change` on
2026-11-17. Verification is isolated; no live release, provider/DB change or archive is
authorized. The pre-existing untracked `env.live` is untouched and excluded from work.

## Preservation baseline

Credential-free identities of 50 existing containers and hashes of protected environment,
Compose/hosting configuration and existing artwork were saved privately under ignored
`.local-backups/unified-shell-and-simulations` (0700; manifests 0600). No credential values
are included in this report. Closing comparison remains required.

## Tasks 1.1–1.3 — shared header

- `npm run build` in `apps/playground`: pass (existing Rollup annotation/chunk-size warnings).
- `npx --no-install playwright test tests/unified-shell.spec.ts tests/architecture.spec.ts tests/localization-resources.spec.ts tests/mission-control.spec.ts --workers=1 --output=/tmp/epa-unified-header-tests`:
  **19/19 pass** on isolated loopback preview/private servers.
- One header/locale selector across catalog, live, fixture alias and ePA routes; desktop
  height 58px, official asset hash unchanged, active navigation and run-preserving view
  changes pass. DE/EN 320px header keyboard/focus/axe checks pass.
- Actual desktop and narrow captures were visually inspected against the live v2 header:
  preserved navy composition, dimensions and typography; official icon replaces the earlier
  approximate inline Y. No other artwork is changed.
- `docs/design/visual-references.md` records shared ownership and current precedence.

The header browser tests use explicit live API fixtures for presentation. These results
do not substitute for the later required real-component OAuth/ePA regression evidence.

## Tasks 2.1–2.3 — catalog

- Path-helper tests: 2/2 pass, including existing bare live/fixture aliases and no ePA live.
- `npm run build --prefix apps/playground`: pass.
- `npx --no-install playwright test tests/unified-catalog.spec.ts tests/mission-catalog.spec.ts tests/localization-resources.spec.ts --workers=1 --output=/tmp/epa-unified-catalog-tests`:
  **9/9 pass**, including DE/EN desktop/mobile captures, full-page axe, equal card/button
  geometry, 10px action gap, exact destinations, no catalog API calls and disabled live
  execution in the ordinary static build. Existing artwork references/bytes are retained.
- Active product/catalog notes now distinguish the new simulation/live UI from historical
  fixture availability. Protocol actor descriptions no longer claim the implemented BFF/
  resource boundary is only planned.

## Tasks 3.1–3.4 — execution and provenance boundary

- Execution/architecture recheck: **6/6 pass** after keeping the new pure resolver behind
  the existing mission application public entry. The original direct domain export was
  caught by the unchanged architecture check and corrected; the rule was not relaxed.
- `tests/simulation-contract.spec.ts`, `tests/oauth-adapter.spec.ts`, architecture:
  **26/26 pass**. Simulation accepts only bounded local fields, rejects credential-shaped
  literals/observations/reports and cannot decode as a real OAuth event.
- Focused isolation plus existing resource/logout regressions: **5/5 pass**, including no
  simulation session/history reads and rejection of a held live resource response after
  entering simulation. Existing live session logic is reused in its own mounted controller.
- Inspection/playback/localization/architecture combined check: **29 existing/boundary
  checks pass**; three new SSR checks initially failed because Playwright transforms TSX
  into component-mount descriptors. The focused harness now compiles the three actual UI
  modules with the already installed build tool and shares one translation context;
  **3/3 corrected rendering checks pass** in DE/EN. No production dependency was added.
- Simulation has separate event/resource presentation variants. Timeline/Inspector/Flow
  filter incompatible provenance, show virtual time and never fabricate a server observer.
  Live resource rendering rejects a simulated result. The runtime guide records the URL
  and mode/logout boundary. TypeScript/build pass.

At this checkpoint **10/22 tasks are complete**. Interactive mission reducers and v2
simulation execution are the next tasks, not functionality claimed by these boundary tests.

## Tasks 4.1–4.4 — OAuth simulation

- Deterministic reducer/content tests cover success, PKCE rejection and permission denial,
  fixed order/channel/actor boundaries, explicit resource action, repeated actions and reset.
- `npm run build` passes; only the existing annotation/chunk-size warnings remain.
- `npx --no-install playwright test tests/oauth-simulation-runtime.spec.ts tests/oauth-simulation.spec.ts tests/simulation-contract.spec.ts tests/architecture.spec.ts tests/localization-resources.spec.ts tests/mission-resource.spec.ts tests/mission-logout.spec.ts --workers=1 --output=/tmp/epa-unified-oauth-clean`:
  **38/38 pass**. Logout/late-response checks are included in `mission-resource`. Simulated initial pause, explicit play/pause/step,
  read boundary, replay without duplication, reduced motion, reset/stale timer/reload and
  language/view persistence pass with zero intercepted service calls.
- Fixed fictional Basic/permission-denial presentation is source-labelled SIMULATION, carries
  no HAPI measurements and creates no real session/eligibility. Inspector shows virtual time
  and no real observer. Existing selected-read/401/403/404/429, held-result/logout and payload
  disclosure regressions pass. A previous combined verification was invalidated by a transient
  editing syntax error; only this clean build/run is acceptance evidence.
- Usage and mode/logout distinctions are documented in the OAuth fixture guide and SPA guide.

Checkpoint: **14/22 tasks complete**; ePA and integrated acceptance remain pending.

## Tasks 5.1–5.3 — conceptual ePA simulation

- `tests/epa-simulation.spec.ts` verifies the success and PAR-rejection reducers: fixed
  10/4-event bounds, service-to-IdP PAR/reference channels, separate user-agent redirects,
  local identity/authorization/VAU explanations, explicit conceptual protected outcome,
  no fake HTTP success or FHIR/clinical payload, idempotence and reset.
- `npx --no-install playwright test tests/epa-simulation.spec.ts tests/epa-simulation-runtime.spec.ts tests/oauth-simulation-runtime.spec.ts tests/architecture.spec.ts tests/localization-resources.spec.ts --workers=1 --output=/tmp/epa-unified-concept-final`:
  **16/16 pass**. DE/EN, Inspector, no ePA live action, failure stopping, keyboard Step,
  reduced motion, reload/mission-departure cleanup and zero service calls pass.
- Earlier failures were test synchronization (key presses before selected-frame settlement)
  and an incorrect header-link name. Corrected tests wait for exact count/selection and
  use the existing brand-to-catalog navigation; no behavior/security assertion was dropped.
- ePA learning notes document the exact lab/concept sources and non-conformance boundary.
  Workspace design records the simulation extension while preserving dated fixture history.

Checkpoint: **17/22 tasks complete**. Integrated verification is in progress.

## Integrated visual review — initial findings

The initial five-surface/native-zoom suite and unchanged live v2 geometry captures passed
9/9. Manual screenshot review then detected the fifth ePA participant wrapping under the
four-column flow grid, despite passing axe/reflow checks. The neutral renderer now derives
columns from its supplied participant count and keeps a readable diagram-local scroll area.
Simulated local channels also now say actor-local explanation rather than observation.
These corrections require fresh screenshot/acceptance evidence below; the initial captures
alone are not final approval. Existing live four-participant geometry assertions are retained.

## Verification corrections retained for review

The first real-harness process ended with exit 143 without a root-cause diagnostic. Only
its five uniquely named disposable containers were stopped/removed explicitly; no existing
stack was changed. A persistent-session retry reached the real journey but the added
simulation helper incorrectly targeted the sidebar while Inspect intentionally hid it.
The helper now navigates through Explore before the mission sidebar. Subsequent complete
real-component runs pass, including actual-cookie simulation isolation and legacy ePA login.
No provider/JWT/security policy was relaxed.

The first broad SPA run passed 207 checks with six obsolete Samples-UI assertions failing.
Their replacement keeps catalog keyboard/back-forward, selection/replay/reset, conceptual
isolation and responsive/axe coverage against v2. The next broad run passed 218 checks
and exposed a real initial Start/Step selection race. Simulation playback now treats the
fresh revealed prefix as the current frontier until selection settles. Domain commands
also carry their local attempt generation, rejecting stale step/resource work after reset.
Focused negative reducer tests verify this directly. Remaining simulation labels no longer
claim four participants, a recorded position or a local observation.

## Task 6.3 — final real isolated runtime

Final candidate built with:

```sh
docker build --target public-runtime --tag epa-lab/playground:unified-shell-acceptance-20261117 apps/playground
PUBLIC_RUNTIME_SPA_IMAGE=epa-lab/playground:unified-shell-acceptance-20261117 PUBLIC_RUNTIME_BFF_IMAGE=sha256:2fa9fc60dba79a2f1e6846087da00c6cf87e1a0fd6e7bee045624e76d91f6e4c PUBLIC_RUNTIME_HAPI_IMAGE=sha256:f15d09f928f2040e0c214b1aa719d4f60ec6b34c636afc90502849ce89ed3466 PUBLIC_RUNTIME_MISSION_CONTROL=true PUBLIC_RUNTIME_SIMULATIONS=true node infrastructure/verify-public-runtime.mjs
```

**Pass, exit 0**, private evidence directory `/tmp/epa-public-keycloak-gpn5te`.
Final SPA identity: `sha256:22092c0ba2cc60180d687ca7f932fc503908b5abb8456c3d1b0e8f32989b9442`.
The existing reviewed BFF/HAPI images above were reused; no backend/security implementation
or production image pin changed.

- Actual HTTPS browser navigation through disposable Nginx/Traefik, normal private-CA and
  hostname validation, real Keycloak login, clean callback, same-run refresh, explicit
  synthetic read, actual BFF observer/HAPI reporter in Inspector, exact-Origin/CSRF logout,
  old-cookie 401 and retained eligible history pass.
- Real HAPI: permitted Access Token → 200; missing permission → 403; missing token/ID Token → 401.
- Both simulations executed with actual BFF authentication cookies present: **zero attempted
  service requests**, no real payload/history/session in simulation, and the authoritative
  live run remains unchanged on return. Back/forward/reload stay local.
- Provider public and legacy matrices: **27 checks each**, including no-PAR standard flow,
  S256 negatives, replay, confidential exchange, callback/grant restrictions and preserved
  mandatory ePA PAR. The existing `test/keycloak.integration.ts` suite also exits 0 against
  the disposable provider, including real legacy browser `/login` → callback → `/session`.
- Proxy path/method/source/rate/cache/error-log negatives, cross-browser run-ID denial,
  browser/storage/server-log secret-sentinel checks and DE/EN 1366/390px axe pass.
- The harness's targeted SPA fixture-withdrawal rehearsal closes its OAuth/provider routes;
  all owned temporary containers are cleaned up. It mounts no existing provider/DB volume.
- Safe summary and four synthetic-only runtime captures are retained under [evidence](evidence/).

This is isolated acceptance, not a public release or a production provider/database migration.
The disposable provider runs Keycloak 26.8.2 start-dev/tmpfs, while existing production-mode
Keycloak and all production policy/data remain unchanged. The earlier successful real runs
are retained as intermediate evidence; final acceptance uses the final image identity above.

## Preservation and operational findings

Closing comparison hashes all **20 protected environment/Compose/hosting/artwork files**:
none changed. The original public/private Playground, BFF, Keycloak, HAPI, PostgreSQL and
routing-container identities/start times/mounts/bindings/networks match the baseline.
**47 of 50** original container records match exactly. Three unrelated Teberru services were
replaced with different images at approximately `2026-11-17T22:13:48Z` during the work:
`teberru-collector`, `teberru-api`, `teberru-admin`. No command in this task targeted those
services; their external update's actor/cause was not investigated. Do not interpret this
report as claiming that all host services remained unchanged by other activity.

No environment credential value is included in this report. The pre-existing untracked
`env.live` is unchanged. No database reset, volume deletion, public routing/deployment,
firewall change, Git commit/push or archive was performed. The earlier privileged UFW
inspection remains an explicit operational follow-up in change 001; this change does not
claim to resolve it. These findings do not authorize repair of unrelated services.

## Final quality acceptance

- `npm run build`: pass on frozen application source; ordinary and production OAuth Docker
  builds pass. Existing Rollup annotation and >500 KiB chunk warnings remain; no dependency
  or lockfile is changed to address unrelated optimization.
- `npm run format:check`: pass; `git diff --check`: pass.
- `openspec validate unified-shell-and-simulations --strict --no-interactive`: pass using
  cached CLI 1.14.1 (`OPENSPEC_TELEMETRY=0 npm exec --offline --yes --cache /tmp/epa-001-task24-npm-cache --package @fission-ai/openspec@1.14.1 -- openspec ...`).
- A later broad non-PTY run completed 218 cases, then ended with exit 143 without a final
  diagnostic while the last English visual case was pending. This is not counted as a clean
  suite result. Clean final acceptance is split into persistent-session batches, preserving
  every case and assertion, with no application/security workaround:

```sh
# Run from apps/playground; both commands own only loopback test servers.
PLAYGROUND_NATIVE_CHROMIUM=/home/yappai/.cache/ms-playwright/chromium-1194/chrome-linux/chrome npx --no-install playwright test --workers=2 --grep-invert='five surfaces' --output=/tmp/epa-unified-quality
PLAYGROUND_NATIVE_CHROMIUM=/home/yappai/.cache/ms-playwright/chromium-1194/chrome-linux/chrome npx --no-install playwright test tests/unified-visual.spec.ts tests/simulation-browser-return.spec.ts --workers=1 --output=/tmp/epa-unified-final-visual
```

First batch: **215/215 pass, exit 0**, including the previously failing immediate Step,
architecture/domain compilation, localization, strict live DTO/security contracts, held
responses, cleanup/capacity/expiry, no implicit execution, all simulation scenarios and
native live 100%/200% zoom. The second batch also includes a new actual back-forward-cache
check beyond synthetic page-return events; its final result is recorded below.

Documentation check: all relative links in the 12 changed/new Markdown planning/usage files
resolve. Active SPA usage now describes simulations, source-separated live execution and
native zoom prerequisites; dated historical verification reports are unchanged. The
[acceptance matrix](acceptance-matrix.md) maps all 18 requirements and 32 scenarios.

## Final acceptance closure

- Visual batch: **4/4 visual cases pass** in `/tmp/epa-unified-final-visual`, including all
  five surfaces, both languages, 1672/1585/390/320px, full-page axe, keyboard/focus, reduced
  motion and native zoom 100%/200% readback/DPR. The same batch's new actual-cache test
  initially waited for a document `load` after history restoration and timed out; trace
  inspection confirmed the wait, not an application failure. This failed result is retained
  honestly in `evidence/visual-batch.log`.
- Corrected cache check uses browser `history.back()` plus actual `pageshow.persisted` and
  URL/state assertions. Command below: **1/1 pass, exit 0, 594ms test**. It proves a genuine
  cached document with two bounded local simulated events remains paused and makes zero
  service requests; it does not use a synthetic pageshow as a substitute. Source UI was
  unchanged for this harness correction. Evidence: `evidence/back-forward-cache.json`.

```sh
# Run from apps/playground, with full Chromium installed.
PLAYGROUND_NATIVE_CHROMIUM=/home/yappai/.cache/ms-playwright/chromium-1194/chrome-linux/chrome npx --no-install playwright test tests/simulation-browser-return.spec.ts --workers=1 --output=/tmp/epa-unified-browser-return
```

All **220 distinct SPA cases** are therefore verified across the clean 215-case quality
batch, four passing matrix cases and the corrected passing actual-cache case. Earlier broad
run failures/interruptions are not represented as clean passes. No required assertion was
removed to obtain these results. The 215-case batch includes the new reset-generation
negative tests and initial Start/Step regression on the final application source.

Manual comparison inspected the catalog, OAuth simulation Explore/Inspect, live OAuth and
ePA screens against the actual released v2 reference, plus representative mobile/native
captures. The final grid keeps all five ePA participants in one readable row with local
scrolling at small widths. Source/provenance/counter labels are explicit in all modes.
Existing live reference geometry/contrast/playback/Inspector/resource checks pass unchanged.
Forty selected DE/EN desktop/320px/native captures, four geometry/zoom JSON records and four
synthetic-only real-runtime captures are retained in `evidence/`, with artifact hashes.
The full screenshot matrix can be regenerated from the tests. Captures contain keyboard
focus rings intentionally; no replacement mission artwork or redesigned layout was introduced.

The final scope comprises SPA shell/catalog/simulation/provenance/UI, focused tests, two
existing-harness verification additions, official icon and affected documentation/OpenSpec
evidence. No application dependencies, auth-client implementation (server), HAPI submodule,
Docker/hosting configuration, production credentials/policies/data or existing release pin
changed. There is no implementation blocker. Public release remains a separate owner action;
this change stays unarchived. Existing UFW follow-up and unrelated Teberru drift remain
operational findings, not silently repaired or declared resolved.

Final OpenSpec apply state: **all_done, 22/22 tasks complete**. Strict validation, final
Markdown links/artifact hashes and changed-path scope checks pass. The change is unarchived.
