# Auth Protocol Playground — Mission Control

## Simulation and live presentation

The isolated `unified-shell-and-simulations` implementation uses one application header,
with the official locally served Yappai icon, for catalog and workspaces. Simulation and
Live Demo are execution kinds (`execution=simulation|live`), separate from the existing
`mode=explore|inspect` and `panel=resources|flow` presentation parameters. Legacy
`view=fixture` always selects network-free simulation, even with a conflicting live value.
The clean OAuth callback path and enabled-runtime bare live URL remain compatible.

Mode selection does not sign out or initiate login/resource work. Simulation makes no
session/history/provider/FHIR calls and cannot use a real cookie as simulated authority.
Live authentication ends only through its existing explicit secure logout/cancellation
or expiry. Virtual simulated timing/outcomes are labeled and never become observed server
events or measured HAPI responses. The deployed release is unchanged by isolated work.

An isolated React/TypeScript browser app for the Catalog and Mission Control Workspace.
Default local development and ordinary builds enable the two local simulations. The public deployment uses
the explicit `public-runtime` image target and executes the existing OAuth/OIDC mission.
Tasks 8.1–8.6 add an explicitly configured private Vite execution binding to the existing
`epa-auth-lab` BFF; it uses no separate authentication service. This package keeps its
independent npm workflow; root `playground:*` scripts use the live hosted profile.

From the repository root, with Node 24:

```sh
npm --prefix apps/playground ci
npm --prefix apps/playground run dev
```

Open <http://127.0.0.1:5173/missions>. Both workspace routes also support direct navigation:

- `/missions/oauth-oidc/workspace?execution=simulation`: paused deterministic Code/S256 simulation, with success, PKCE rejection and permission-denial examples.
- `/missions/epa-concept/workspace?execution=simulation`: conceptual PAR/role simulation, including a fixed PAR-rejection example and a data-free protected-boundary explanation.

Start reveals one paused step. Step advances one transition; Play/Pause controls automatic
progression and stops before the explicit resource action. Previous, Replay and selecting
events inspect already revealed frames without repeating work. Reset simulation discards the
local attempt and result. Reduced motion disables autoplay. Reload or mission/execution
switch starts idle; locale and Explore/Inspect changes retain progress and selection.
Only an explicit language preference persists. Diagrams scroll locally at narrow widths;
readable text is not scaled down. Live Replay/Reset view remain presentation-only.

## Explicit private execution

Only `npm run dev:private` can enable this binding. Both server-side variables are required:

| Setting                     | Meaning                                                                                                        |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `PLAYGROUND_PRIVATE_ORIGIN` | Exact canonical local/private application origin matching the BFF profile and registered `/api/oauth/callback` |
| `PLAYGROUND_BFF_TARGET`     | Canonical local/private origin of the configured existing BFF instance, reachable from Vite                    |

Both values reject credentials, paths, query/fragment and public hosts. HTTP/HTTPS loopback
and private IPv4 origins are supported. Vite binds only to loopback, proxies `/api/oauth`
with the browser's Host/Origin intact and does not follow upstream redirects. Its private
logger omits request URLs, queries and raw exceptions. The target stays server-side.
No client secret is a Vite variable. Static builds, including `build --mode private`, and
production preview compile execution off and add no API proxy. URL parameters cannot enable it.
The browser must also be at the configured canonical origin before execution is offered.

For an already configured private BFF/canonical frontend origin, use the existing dev server:

```sh
PLAYGROUND_PRIVATE_ORIGIN=http://localhost:5173 PLAYGROUND_BFF_TARGET=http://127.0.0.1:18080 npm --prefix apps/playground run dev:private
```

The example requires that exact callback origin to be registered and configured server-side;
it does not change an existing realm. On this Dev Server, the registered private origin's
port is already occupied by the existing deployment. Do not replace that service to run
this example. The focused test below maps the unchanged canonical browser origin only to
task-owned loopback listeners, preserving normal navigation, cookie scopes and callback
registration. Directly opening a different Vite origin keeps execution disabled.

The catalog offers two OAuth actions only when the existing runtime guard permits live
execution: primary Simulation / secondary Live Demo. ePA offers conceptual Simulation only.
Static builds omit the unavailable Live action. `view=fixture` remains a compatibility alias
for simulation, including when it conflicts with `execution=live`.

The following lifecycle applies only to **Live Demo**.

The existing Workspace restores through `/api/oauth/session` and the owned event API on
return/refresh, with a one-shot expiry read and browser-return recovery. These reads never
start login, exchange codes or request a resource. Start/Retry navigates the top-level
browser to `/api/oauth/login`; Keycloak owns the login form. Retry creates a fresh attempt.
The callback returns by clean 303 to the existing Workspace. Unknown, expired or restarted
context offers safe recovery; it never reconstructs a run from examples.

**Access resource** calls the fixed BFF resource route; **Sign out** posts its context-bound
CSRF header with the browser's exact Origin. The CSRF value is held only in application
memory and never enters presentation/events/storage. Credentials remain in the BFF and
HttpOnly scoped cookies. All API fetches use same-origin mode/credentials, no-store, no
redirect following, a ten-second timeout and a 128 KiB decoded JSON limit. Zod **4.6.6**
validates the finite version-1 wire contract and minimal session/resource DTOs. Producer/
consumer compatibility is checked against the existing BFF schema in repository tests.
Unknown fields, versions/kinds, actor/channel substitutions, broken order and unsafe data
have a localized unavailable outcome with no raw JSON or exception fallback.

Authentication, current login outcome and the last resource outcome are separate. Resource
execution is disabled while restoring or while the current attempt is pending/failed;
an earlier retained BFF authentication is still reported accurately. Local cleanup remains
available independently of trace/resource capacity. Logout commits its authoritative result
before reading events, retains eligible bounded history under its original expiry and
rejects late UI results. It does not claim provider-wide SSO logout or token revocation.
Live Replay, Reset view, stages and event selection make no protocol calls. Locale changes
retain run/event identities and selection.

### Observation presentation

Protocol-flow accepts `FlowEvent = FixtureEvent | ObservedEvent | SimulatedEvent`. Simulation
records have a separate local ID, sequence, virtual elapsed time and explicit synthetic outcome;
they contain no real observer, server report or wall-clock timestamp. The observed variant
adds actual observer/time, per-run sequence, outcome and an optional explicitly reported
evidence block. It introduces no OAuth imports or wire decoding into the renderer. The
mission-owned adapter projects only allowlisted values into this neutral shape. Local BFF
checks use arrowless markers; actual messages retain directional paths and synchronized
actor/timeline/Inspector selection. A redirect event represents BFF → browser issuance.
It does not claim receipt by Keycloak. Provider password/PKCE/token internals remain separate
explanations without fabricated events, observers, timestamps or network arrows.

Only a validated HAPI report supplies `reportedBy: res-server`. The containing response is
observed/timed by `auth-client`. Missing/invalid reports remain unavailable; response status
does not imply a list of internal checks. BFF-local rejection never becomes a HAPI denial.
Repeated event reads preserve the original IDs, order and timestamps. An incomplete trace
is labeled explicitly, including after successful logout without a stored logout event.

### Focused private verification

With the [isolated secured HAPI setup](../../infrastructure/README.md) healthy, the configured
private Keycloak reachable and existing BFF source built, run from repository root:

```sh
corepack pnpm build
PLAYGROUND_VERIFY_PRIVATE=true npm --prefix apps/playground run test:private
```

This starts temporary instances of the existing BFF and private Vite on loopback ports.
It creates/removes one fictional identity, navigates the real provider, validates safe
Workspace restoration/resource/logout and scans BFF/browser/HAPI logs in memory. It neither
updates `.env`, registrations, running services/volumes nor adds public routing. Screenshots
are taken only at clean Workspace URLs; no trace/HAR/video or raw callback is retained.
Sanitized evidence is stored under ignored `.cache/oidc-runtime/real/`.

For the browser/accessibility matrix, run `npm test` as usual. Native zoom additionally
requires a full Chromium executable through `PLAYGROUND_NATIVE_CHROMIUM`; without it, those
two tests report an explicit skip. They use Chrome's own Settings zoom API in disposable
regular profiles, verify readback/DPR/reflow, and clean up the profiles. Viewport scaling
and CSS zoom are not substitutes. See the dated [task 8 evidence](../../openspec/changes/001-oidc-pkce/spa-runtime-verification.md)
for actual checks, screenshots and limitations. Tasks 9.1–9.5 now pass. The
[persistent private acceptance/runbook](../../openspec/changes/001-oidc-pkce/private-deployment-acceptance.md)
verifies the actual deployed port-5173 frontend, real Keycloak/HAPI journey, logout/history
and restart recovery. The owner-approved [deployment plan](../../openspec/changes/001-oidc-pkce/private-deployment-plan.md)
remains the private scope. The [earlier deployment/rollback record](../../openspec/changes/001-oidc-pkce/private-deployment-verification.md)
and [firewall evaluation](../../openspec/changes/001-oidc-pkce/firewall-verification.md) preserve
the prior failures and correction. The public installation now uses its own approved
HTTPS OAuth profile; private verification history does not establish current public acceptance.

## Hosted deployment

The live site is <https://auth-playground.yappai.de/missions>. Select **OAuth-Mission starten**
(or **Start OAuth mission** in English), then start login in the workspace. Individual demo
accounts are provisioned by the owner and require a first-login password change. The ePA
mission remains conceptual. See the [release evidence](../../openspec/changes/public-playground-oauth-deployment/live-release-verification.md).

From the repository root:

```sh
npm run playground:up
npm run playground:logs
npm run playground:down
```

Yoster and these scripts use `infrastructure/docker-compose.host.yml` with private
`.env.live`. Starting the playground reconciles the complete live stack; stopping it selects
only the existing public UI/proxy container. There is one public hostname and deployment.
See the root [Yoster setup](../../README.md#yoster-setup) for immutable images and storage.
Yoster rebuild requests cannot replace the live public image with the default fixture build.

The `public-runtime` Docker target builds Vite's `public-oauth` mode and serves the existing
UI with restricted Nginx routes. The BFF holds tokens and credentials; the SPA talks to
same-origin `/api/oauth` only. Nginx resolves Keycloak through Docker DNS, trusts the verified
Traefik peer and uses a reserved backend IP for the BFF/provider trust configuration.
Direct and spoofed ingress is rejected. Undeclared provider/admin/resource paths are closed.

The project-specific watched route is `../infra/traefik/dynamic/epa-lab.yml` (outside this
checkout), rendered from `infrastructure/traefik/epa-lab-public.yml.template`. Existing
Cloudflare tunnel HTTPS terminates before Traefik. Keep the verified Cloudflared/Traefik
peer addresses in sync with the private environment; ordinary restarts retain them.

The standalone `docker-compose.playground.yml` and default Docker target support static
local development. The public Yoster manifest selects the live host profile.

## Language and translation resources

German is the default and fallback regardless of browser language. The header's native Deutsch/English selector changes the current interface without navigation or loss of learning state. Explicit choices are saved under `auth-protocol-playground.locale` and restored on reload. Invalid/unreadable preferences fall back to German; denied writes leave switching usable in memory for the current page lifetime. No browser-language detector, cookie or translation backend is used.

Accepted [ADR-0004](../../docs/architecture/decisions/ADR-0004-localization-and-i18n.md) governs localization. `src/app/i18n.ts` initializes i18next once before rendering; feature UI uses `react-i18next` without importing app initialization. Six UTF-8 JSON resources in `src/locales/{de,en}` contain common navigation, mission-owned content and protocol-flow presentation. Add semantic keys to both languages together. Use interpolation/plural forms for variable text; technical literals and evidence values remain unchanged. Domain/data hold plain content references, neutral statuses and stable IDs, with no localization runtime/dictionary dependencies. Announcements store action intent rather than translated sentences.

Run `npm --prefix apps/playground test` for all checks, or from this package run `npx playwright test tests/localization-resources.spec.ts tests/localization.spec.ts` after `npm run build` for localization checks. The resource tests check both dictionaries and mission/UI references, interpolation/plurals, negative cases and isolated German fallback. The existing architecture suite enforces the narrow composition/resource and UI/localization dependency edges. Browser tests cover language persistence, state retention, technical evidence and accessibility; native browser zoom evidence is recorded separately in the change report.

The Mission Control design foundation adds directed fixture paths under actor swimlanes. Select a path or timeline sample to inspect the same interaction; unrelated paths remain visible. Mission-defined channel labels accompany solid/dashed lines. Internal checks use a separate actor-local annotation labeled Not observable, with no network arrow. The structured map alternative describes roles, endpoints and channel semantics.

The visual refinement keeps participant centers/lifelines aligned, uses content-sized message rows with separate arrow bands and strengthens selected-state feedback. `tests/sequence-layout.spec.ts` checks endpoint alignment, long wrapped labels, reverse arrows, uneven groups, ordering and readable Fit. Its synthetic layout content is test-only and is not a registered mission. Actual Chrome page zoom at 100% and 200% is recorded separately in the change's verification report; viewport/device-scale tests remain supplementary.

```sh
npm --prefix apps/playground run typecheck
npm --prefix apps/playground run build
npm --prefix apps/playground run format:check
```

For browser verification, install Playwright Chromium once:

```sh
cd apps/playground
npx playwright install chromium
npm test
# Full native-zoom acceptance (in addition to the ordinary suite):
PLAYGROUND_NATIVE_CHROMIUM="$(node --input-type=module -e 'import {chromium} from "playwright"; process.stdout.write(chromium.executablePath())')" npm test
```

Tests build the app and launch a local production preview server automatically. Screenshots and traces are generated under the ignored `test-results/` directory. If the machine requires system certificate trust for Node, set `NODE_USE_SYSTEM_CA=1` for dependency/browser downloads; do not disable TLS verification.

The frontend follows [ADR-0003](../../docs/architecture/decisions/ADR-0003-capability-first-code-organization.md):

```text
src/
  app/                        # composition, routing and unknown-route recovery
  features/mission/
    ui/                       # catalog and workspace composition
    application/              # mission lookup, live and local simulation coordination
    domain/                   # canonical mission contracts and finite simulation reducers
    data/                     # registry, safe simulation content and live DTO adapters
  features/protocol-flow/
    ui/                       # diagram, layout geometry, timeline and Inspector
    application/              # single actor/event inspection selection
    domain/                   # neutral actors, events, channels and safe evidence
  main.tsx                    # existing Vite entry
  styles.css                  # existing global visual system
```

Mission's public `index.ts` connects to app composition. Protocol-flow exposes `contracts.ts` (types), `selection.ts` (coordination hook) and `index.ts` (UI); internal modules import their own implementations directly. Domain/application code does not import UI barrels. No protocol-flow data layer or shared UI folder is needed by the current application.

`Workspace` mounts separate live/OAuth-simulation/ePA-simulation controllers before
`useMissionWorkspace` composes neutral inspection, filtering and playback. The explicitly
enabled `useOAuthMission` alone owns live API lifecycle. It reuses `useProtocolSelection`,
which owns one active actor/event inspection and derived highlights. Map scale, scrolling
and focus stay in UI. `tests/architecture.spec.ts` checks dependency direction, cycles,
canonical models and framework-independent domain compilation. Only the existing two
missions are registered. Task-8 implementation uses the accepted local/private approval;
task 9.5 now verifies persistent private execution. Public authentication still requires
the approved public deployment profile; see the current hosted deployment above.

See [verification.md](verification.md) for scope, adaptations and verification evidence.

The subsequent [design foundation verification](../../openspec/changes/mission-control-design-foundation/verification.md) records the directed-interaction refinement and its visual comparison.

## Isolated verification and release boundary

See [implementation evidence](../../openspec/changes/unified-shell-and-simulations/implementation-verification.md)
and the [acceptance matrix](../../openspec/changes/unified-shell-and-simulations/acceptance-matrix.md)
for the exact commands, native zoom captures and real-component rehearsal. This change does
not release an image. Public deployment needs a separate owner instruction. A future targeted
SPA release must retain the previous immutable SPA pin and all existing private environment
settings. Rollback restores only that saved SPA pin/container; the BFF/provider/HAPI/data need
no migration or rollback. The disposable real-runtime harness also rehearses its existing
fixture withdrawal without touching the running deployment.

For a future owner-authorized SPA release, first record the running immutable SPA image:

```sh
# Read-only baseline, repository root:
docker inspect --format '{{.Image}}' epa-lab-playground
```

Targeted rollback, only after separate release authorization: restore that saved image to
`PUBLIC_PLAYGROUND_IMAGE` in the existing private `.env.live`, preserving every other value,
then use the existing host profile for only the SPA:

```sh
docker compose --env-file .env.live -f infrastructure/docker-compose.host.yml config --quiet
docker compose --env-file .env.live -f infrastructure/docker-compose.host.yml up -d --no-deps --no-build --pull never --wait --wait-timeout 120 playground
```

These are rollback instructions, not commands executed by this implementation. Keep the BFF,
Keycloak, HAPI, PostgreSQL, volumes and routing unchanged. Recheck `/health`, catalog and the
expected execution mode after any authorized rollback.
