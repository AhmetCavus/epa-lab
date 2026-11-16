# Tasks 8.1–8.6 — Private SPA execution and truthful observations

**Date:** 2026-11-13. **Scope:** only tasks 8.1–8.6. The existing Mission Control SPA,
mission-owned adapter, neutral presentation, private Vite configuration and focused
verification. No group-9 implementation or availability promotion.

## Baseline and boundaries

The checkout began clean on `main`, tracking `origin/main`, at
`f4018f6e88b40a7ae80bff2248d7e80dad808965`. OpenSpec selected the existing repository root,
`spec-driven`, `ready`, **39/50** complete. Both approved reference PNGs were inspected.
The starting frontend passed **36 tests**; **28 baseline screenshots** were preserved before
source changes. The existing stylesheet, runtime artwork, accepted ADRs, backend code/config,
Keycloak assets, historical reports, actual `.env`, hosting manifest and Traefik file were
hashed. All **45 existing containers**, volumes, networks and port bindings were recorded.

This change adds no backend service or authentication framework. HAPI remains clean at
`e65bafc279f02f44b19b47ca7326015886047a63`; its dependencies/security and the existing
Keycloak/ePA/PAR configuration are unchanged. Default development, production builds,
production preview and the existing public deployment remain fixture-only. Catalog
availability remains Fixture preview/Planned; task 9.5 is not executed.

## Task 8.1 — Neutral observed presentation

`FlowEvent` extends the existing fixture contract with an explicit `ObservedEvent` variant.
It carries actual observer/time, run sequence and outcome, plus an optional separately
reported evidence block. Protocol-flow imports no OAuth, Keycloak, HAPI or mission
implementation and performs no API calls or OAuth validation. Its single selection hook
still synchronizes actor highlights, directional paths, timeline and Inspector.

Observed BFF-local checks use arrowless markers with an actor-local legend. The issued
authorization redirect is BFF → browser, without claiming provider receipt. Provider
password validation, PKCE comparison and token creation remain separate explanations,
without observed events, timestamps or internal network arrows. An actual resource response
is observed/timed by `auth-client`; its explicit report identifies `res-server` independently.
Unavailable reports stay unavailable. Neither an HTTP result nor a BFF-local rejection
becomes an inferred HAPI check list or denial.

Fixture provenance, empty/loaded behavior, conceptual ePA and the public-entry/cycle/domain
checks pass. Runtime-only subtitles, footer/context wording and empty states distinguish
the private integration from fixtures. Recorded IDs, timestamps and per-run order are
retained rather than replaced with rendering time or learning-checkpoint position.

## Tasks 8.2–8.4 — Adapter, restoration and actions

The existing mission capability owns the version-1 decoder, API calls, projection and
`useOAuthMission` coordination. The standalone SPA validates the BFF producer's finite
contract without bundling backend source. Compatibility tests execute the trusted pure
producer schema and cover all **21 event kinds**. Unknown versions/kinds/fields, unsafe
evidence, actor/channel changes, broken identity/sequence, oversized data and inconsistent
resource status/reports are rejected. There is no raw JSON/body/exception fallback.

Requests use fixed same-origin paths, cookie credentials, no-store and redirect refusal.
Decoded JSON is capped at **128 KiB** and API work at **10 seconds**. No caller-selected
issuer/client/callback/resource URL/token controls are added. OAuth credentials remain in
the existing BFF. Context-bound CSRF material is held only in application memory and used
only for the logout header; it never enters teaching evidence or browser storage.

The binding requires private Vite **serving** mode and two validated server-side origins:
`PLAYGROUND_PRIVATE_ORIGIN` and `PLAYGROUND_BFF_TARGET`. It rejects public/credential-bearing/
noncanonical origins. The browser origin must match the configured canonical origin.
Vite listens on loopback and preserves browser Host/Origin through its existing API proxy.
Private diagnostic logging uses closed messages without URLs, callback queries or exceptions.
Static builds, including `build --mode private`, and production preview compile execution
off. Query parameters cannot enable it. `?view=fixture` selects only the preview presentation.
The conceptual ePA mission has no execution binding and makes no backend calls.

Start/Retry uses normal top-level navigation to `/api/oauth/login`. Keycloak supplies the
login form and the callback returns by clean 303 to the existing OAuth Workspace. Return,
refresh, expiry and browser-return recovery read only session/current owned events. They
never repeat authorization, exchange or resource operations. Missing/restarted/expired
context presents safe recovery without reconstructing events from samples.

Authentication, current attempt and last resource outcome are separate. Pending/failed
current attempts disable conflicting resource execution without claiming that retained
earlier authentication belongs to the new attempt. HAPI 200/401/403 DTOs, unavailable reports,
transport/capacity failures and BFF-local rejection have distinct safe presentations.
Replay/Reset/checkpoints/actor/event selection make no protocol calls. Retry creates a new
attempt. Refresh/replay/language changes preserve existing run/event identity.

Logout uses native browser Origin plus the current CSRF header. It commits the authoritative
signed-out response before event retrieval, retains eligible bounded history under its
original deadline, and ignores stale asynchronous UI results. Full/failing event storage
cannot restore authentication or hide the signed-out outcome. Resource-capacity failure
refreshes session state independently, preserving local cleanup. Tests cover late resource
completion, pending cancellation, expiry and unavailable history without invented events.

The [frontend guide](../../../apps/playground/README.md#explicit-private-execution) documents
configuration, action/recovery semantics, producer/consumer ownership and reproducible commands.

## Task 8.5 — Localization

Matching German/English semantic resources cover all 21 event explanations, runtime actions,
phases, authentication/current-run/resource states, recovery, report provenance and accessible
labels. German default/fallback and guarded explicit locale persistence are unchanged.
Domain/data/application import no dictionaries or localization runtime. Protocol identifiers,
evidence values, UUIDs, timestamps and sequence stay literal; UI explanations are localized.
Language switching preserves mission/run, retained checkpoint, actor/event selection,
fixture state and map scale, with no protocol operation. Real browser storage contained
only the explicitly chosen locale; HttpOnly API cookies remained inaccessible to scripts.

## Task 8.6 — Visual and accessibility evidence

The existing stylesheet and all artwork bytes are unchanged. Status/actions occupy existing
objective/header/action areas; cards, typography, dark navy/cyan hierarchy, swimlanes,
Inspector and timeline remain recognizable. Both reference PNGs and representative current
screens were visually inspected, including readable real Inspector evidence. Manual review
caught and corrected leftover fixture-only runtime wording before final verification.

The final **91-test** run has **no failures or skips**. It includes the existing 36 fixture/
conceptual regressions; schema/adapter, runtime/lifecycle/ownership-presentation tests;
architecture/cycle/public-entry checks; localization resources; axe WCAG 2/2.1/2.2 A/AA
scans; visible keyboard focus/selection; logout focus recovery; reduced motion; structured
diagram alternative; readable Fit and local scrolling. Both locales pass at **1366, 1024,
390 and 320 CSS pixels**. Empty/restoring/authenticated/allowed/denied/failed/signed-out
states are captured in the existing layout. State/negative UI cases use controlled API DTOs;
they are separate from the actual private provider/resource check below.

Full Chromium **141.0.7390.37** uses its native Settings zoom API in disposable regular
profiles. Both locales verify readback at **1 and 2**, with a constant **1366px outer width**:

| Native zoom | Inner viewport | DPR | Visual viewport scale | CSS zoom |
| ----------- | -------------- | --- | --------------------- | -------- |
| 100%        | 1366 × 761     | 1   | 1                     | unset    |
| 200%        | 683 × 380      | 2   | 1                     | unset    |

This is native desktop page zoom, independently checked from map zoom and viewport-matrix
tests. Fit/Reset leave the browser zoom intact. Inspector, evidence, actions and signed-out
history remain accessible. The pinned full browser was downloaded into `/tmp/epa-001-spa`
using Playwright's compatible Ubuntu 24.04 platform override on this Ubuntu 26.04 host;
the system browser/profile was not changed. Browser profiles are removed after the tests.

Artifacts are local and ignored under `apps/playground/.cache/oidc-runtime/`: **28 before**,
**62 final after** screenshots, four real-workspace/Inspector captures, native metric JSON
and fixture comparison JSON. **26/28** final fixture images are pixel-identical. The other
two were visually inspected: catalog content is unchanged with different trailing blank
capture height, and the 1024px map has a different horizontal scroll offset. Panel/artwork/
text layout remains the same; endpoint/lifeline/collision tests pass. Pixel equality across
new runtime content or different locales is not claimed.

| Evidence                   | Local artifact                                                                                                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalog baseline/current   | [Before](../../../apps/playground/.cache/oidc-runtime/before/catalog.png) / [After](../../../apps/playground/.cache/oidc-runtime/after/catalog.png)                                |
| Existing fixture at 1024px | [Before](../../../apps/playground/.cache/oidc-runtime/before/selected-1024.png) / [After](../../../apps/playground/.cache/oidc-runtime/after/selected-1024.png)                    |
| German runtime at 320px    | [Observed/report view](../../../apps/playground/.cache/oidc-runtime/after/runtime-observed-de-320.png)                                                                             |
| Actual native 200%         | [German](../../../apps/playground/.cache/oidc-runtime/after/native-de-200-observed.png) / [English](../../../apps/playground/.cache/oidc-runtime/after/native-en-200-observed.png) |
| Real HAPI report           | [Inspector](../../../apps/playground/.cache/oidc-runtime/real/real-resource-inspector.png)                                                                                         |
| Real post-logout rejection | [Inspector](../../../apps/playground/.cache/oidc-runtime/real/real-local-rejection-inspector.png)                                                                                  |
| Native zoom metrics        | [JSON](../../../apps/playground/.cache/oidc-runtime/native-zoom.json)                                                                                                              |

## Focused real private browser check

`tests/verify-private-runtime.mjs` starts the existing compiled BFF and private Vite on
loopback, creates/removes one fictional identity, and uses the unchanged configured Keycloak
realm/client/callback. A test-only native browser HTTP proxy through that same Vite listener
maps the canonical origin to these isolated listeners; Keycloak is reached directly. It
preserves native navigation, cookies and Origin and disables no browser/application security.
No realm registration, deployment route or existing service is changed.

An initial interception-based harness failed because Playwright routes only the first URL
of a redirect chain; it did not remap the returned callback. The corrected native proxy
transport completes the round trip. Only fixed operation/status/cookie-presence diagnostics
were retained during diagnosis, without callback URLs or secrets. No product security fix,
policy change or relaxed validation was needed to make the browser check pass.

Actual final results:

- One normal login navigation; **zero PAR calls** for the standard profile.
- Real Keycloak form and successful clean callback return; **9** actual login observations.
- Reload preserves the same run/event identities and triggers no login/resource action.
- One actual secured HAPI synthetic read, **200**, with explicit `allowed/demo-read-allowed`
  report and **12** correctly ordered observations afterward.
- Native Origin/CSRF local logout; resource action disabled; explicit post-logout BFF request
  returns **401** without another HAPI call. **14** owned events remain inspectable after
  reading the local rejection; that event is attributed to BFF, not HAPI.
- Actual codes/state/nonce/verifiers/tokens/client credentials/cookies/CSRF and fictional
  identity sentinels are absent from rendered learning content, storage and captured BFF/
  browser/HAPI logs. Log scanning happens in memory. No trace, HAR, video, provider password
  screenshot, raw callback or full HTTP body is saved. Screenshots use clean Workspace URLs.
- Realm/client/policy/user/mapping preservation digest matches after deleting the test user.

This focused implementation check does not execute group 9's complete cross-component
negative/acceptance matrix or promote runnable catalog availability.

## Actual commands

From repository root:

```bash
corepack pnpm build
```

From `apps/playground`:

```bash
npm run typecheck
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 PLAYGROUND_NATIVE_CHROMIUM=/tmp/epa-001-spa/browsers/chromium-1194/chrome-linux/chrome npm test
PLAYGROUND_VERIFY_PRIVATE=true npm run test:private
npm run format:check
npm audit --json --cache /tmp/epa-001-spa/npm-cache
```

TypeScript, production build and **91 tests pass**. Native zoom has no skipped cases with
the supplied full browser. The frontend audit has **zero vulnerabilities**. New SPA
validation is pinned to patched Zod **4.6.6**. The initial attempt to reuse 4.6.5 identified
[GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5); it was corrected before
completion. The existing BFF still pins 4.6.5 under this task's preservation scope. That
known dependency advisory remains a separate backend follow-up before final acceptance;
this report makes no claim about its exploitability under the BFF's existing input limits.

The approved HAPI integration profile reused its verified security image through a private
image-only override. The private second env file contained trusted discovery's JWKS URI:

```bash
docker compose --env-file .env --env-file /tmp/epa-001-spa/integration.env -f infrastructure/docker-compose.integration.yml -f /tmp/epa-001-spa/image.compose.yaml --profile integration up --no-build --pull never -d --wait --wait-timeout 240 res-server
```

Both task-owned containers were healthy; HAPI was published only at `127.0.0.1:18083`, with
dedicated database/loopback networks and Traefik disabled. PostgreSQL had no port or Docker
volume; only its disposable tmpfs database was used. Status-only liveness/readiness returned
200/`UP`. The HAPI source and original deployment were not rebuilt/replaced.

## Final preservation and task tracking

The two task-owned HAPI/PostgreSQL containers were stopped and removed explicitly, followed
by their two dedicated networks. No existing stack was taken down and no Docker volume was
removed. The test-only BFF/Vite listeners and browser profiles were closed by their harnesses.

```bash
docker compose --env-file .env --env-file /tmp/epa-001-spa/integration.env -f infrastructure/docker-compose.integration.yml -f /tmp/epa-001-spa/image.compose.yaml --profile integration stop --timeout 15 res-server res-server-db
docker compose --env-file .env --env-file /tmp/epa-001-spa/integration.env -f infrastructure/docker-compose.integration.yml -f /tmp/epa-001-spa/image.compose.yaml --profile integration rm --force res-server res-server-db
docker network rm epa-lab-integration_database epa-lab-integration_loopback
```

Final read-only checks confirm **45 original containers** retain the same IDs, images,
creation/start times, states, mounts, networks and port bindings. The complete network and
volume inventories match the initial snapshot. All **101 protected files** match their
initial hashes; HAPI's reviewed commit and working tree remain unchanged. Existing Keycloak
realm/client/scope/policy/user/mapping checks pass, and no disposable browser identity remains.
The public fixture deployment and routing were not changed or restarted.

Documentation links, package commands, Compose paths/services/options and the four existing
Compose configurations validate. Temporary verification helpers only inspect files, resolved
configuration and inventory; their resolved environment-bearing JSON stays outside the repo
with restricted permissions. The final source/distribution scan covers **50 files**, finding
no configured secret or persisted JWT. Actual runtime credential scanning is separately
covered by the in-memory browser check above.

Additional actual commands from repository root:

```bash
corepack pnpm lint
git diff --check
python3 /tmp/epa-001-spa/check-links.py --report /tmp/epa-001-spa/links.json
python3 /tmp/epa-001-spa/check-commands.py
python3 /tmp/epa-001-spa/verify-preservation.py
KEYCLOAK_ADMIN_URL=http://127.0.0.1:5555 node --env-file=.env /tmp/epa-001-spa/verify-keycloak.mjs
OPENSPEC_TELEMETRY=0 npm exec --offline --yes --cache /tmp/epa-001-task24-npm-cache --package @fission-ai/openspec@1.14.1 -- openspec validate 001-oidc-pkce --strict
```

Typecheck/build, all **91 browser/contract/architecture/localization/accessibility tests**,
the focused real private round trip, native desktop zoom, formatting, lint and strict OpenSpec
validation pass. Tasks **8.1–8.6** are complete, advancing progress to **45/50**. Task checkboxes
were reconciled individually against fresh CLI task/source-line output. Tasks **9.1–9.5** remain
unchecked and unchanged; the complete final acceptance matrix and availability promotion are
still pending. No task-8 verification blocker remains. The existing backend dependency advisory
identified above remains an explicit follow-up outside this frontend implementation.
