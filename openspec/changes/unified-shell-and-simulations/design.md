# Design

**DRAFT — planning only, 2026-11-17.** See [proposal.md](proposal.md) for scope and the two
[shell](specs/unified-application-shell/spec.md) / [simulation](specs/protocol-simulations/spec.md)
behavior contracts. No implementation, deployment or provider/data modification is authorized.

## Context

Inspected source on `feat/mission-control-v2`, commit `97935eff2ce2a877e0a85addc6397cb3be312522`:

| Existing component                                                                  | Reuse / necessary change                                                                                                                                                              |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/App.tsx`                                                                   | Owns routing, skip link and language control, but renders the older catalog header. Compose one shared header here.                                                                   |
| `mission/ui/workspace/WorkspaceFrame.tsx`                                           | Owns the live v2 header and mission sidebar. Extract its header; retain the frame/sidebar.                                                                                            |
| `mission/ui/Catalog.tsx`, `application/mission-catalog.ts`                          | Existing hero/card artwork and links. Replace action/availability presentation and extend path selection.                                                                             |
| `WorkspaceRoute.tsx`, `useWorkspaceView.ts`                                         | `view=fixture` disables runtime; `mode=explore                                                                                                                                        | inspect`and`panel=resources | flow` already select presentation. Preserve these contracts. |
| `MissionControl`, `ExploreView`, `InspectionView`, `ResourceForm`, `ResourceResult` | Working v2 composition; currently typed to live execution, observed events and real resource-result sources. Add narrowly typed simulation presentation.                              |
| `useOAuthMission`, `oauth-api`, `oauth-contract`, `oauth-presentation`              | Existing real lifecycle and strict DTO validation. Reuse unchanged; do not forge their DTOs for simulation.                                                                           |
| `protocol-flow` Timeline/Inspector/RecordedFlow, playback/selection/filter hooks    | Neutral presentation to reuse. Current event union is fixture/observed; outcome filters and several labels currently assume observations. Extend explicitly for simulated provenance. |
| `mission/data/oauth.ts`, `epa.ts`, `PreviewWorkspace`                               | Static OAuth samples and concept-only ePA. Replace their default learning path with simulations, retaining old link semantics rather than a third execution mode.                     |

Paths above are relative to `apps/playground/src` unless stated otherwise. The main-spec
inventory is empty. Unarchived change 001 and `mission-control-ux-v2` remain the security,
architecture and presentation baseline, not implementation work to repeat.

The live v2 [release evidence](../mission-control-ux-v2/public-release-verification.md) and
[actual Explore capture](../mission-control-ux-v2/evidence/07-public-explore.png) establish
the authoritative header. Both original catalog/workspace PNGs and the v2 reference
contract were inspected. Earlier product/UX text still contains historical fixture-only
and no-simulated-result statements; this proposal explicitly replaces those presentation
limitations, not authentication/security requirements. Reconcile active wording during
implementation without rewriting historical verification or archiving earlier changes.

## Goals / Non-Goals

**Goals:** one header, two explicit execution kinds, reusable v2 presentation and two small
deterministic mission-owned simulations. Keep learning progress, selected playback frame,
synthetic session state and authoritative live authentication distinct.

**Non-Goals:** new authentication/provider abstractions, event APIs, workflow/plugin engines,
resource allowlists, backend services, dependencies, databases, operational changes or
normative gematik choreography. No UI for entering credentials or tokens into simulation.

## Decisions

### 1. Extract the actual header and use the official icon

Create one mission UI `ApplicationHeader`, exported through `features/mission/index.ts`
and rendered once by `App`. It accepts presentation navigation and the existing language
control; mission-owned navigation supplies contextual destinations. `WorkspaceFrame`
retains sidebar/content only. Remove the duplicate header and the CSS rule hiding
`.site-header` when `.mission-control` is present. Move only the tokens needed by the
shared header into common scope; do not restyle unrelated components.

Preserve the live desktop baseline: 58px header, 28px horizontal padding, 20px main gap,
18px brand/product typography and the existing logo frame/nav/focus treatment. Use a
single responsive rule set and existing mobile reflow. Catalog marks Missions active;
workspaces expose Missions/Explore/Inspect with correct `aria-current`. Do not create
nonfunctional Explore/Inspect links on the catalog. Execution selection belongs beside
the workspace title/provenance, not in place of these navigation items.

The official website checkout's `pwa/src/components/SiteHeader.tsx` uses
`/icon/png/yappai-y-icon-64.png`. The inspected, visually reviewed source asset is:

- Website URL: `https://yappai.de/icon/png/yappai-y-icon-64.png`.
- Available source: `/srv/yappai/hosting/yappai/pwa/public/icon/png/yappai-y-icon-64.png`.
- SHA-256: `0b382fd3107c7fdadbe2483e47f87ec3c69c2558ef3aa24878b2f0ad4515aedd`.

Vendor that exact asset into the Playground's existing public assets during implementation,
preserving aspect ratio within the logo frame. This removes the current approximate inline
Y mark without inventing a replacement or a new branding abstraction. Public HTML requests
from this planning environment returned 403; the local official website source identifies
the asset independently. This is not evidence that either public site is down or a blocker
to planning. No runtime hotlink is needed. Alternative: keep two styled headers or copy the
current hand-built SVG; rejected because neither satisfies shared authoritative branding.

### 2. Keep routing backward compatible and fail closed

Use `execution=simulation|live`, independent of the existing `mode` and `panel`. Resolve
execution once before mounting a controller; retain it in view/panel/mission navigation.

| Input                                                                                   | Resolution                                                                 |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Any legacy `view=fixture`, including a conflicting live parameter                       | Idle simulation; retain the alias while navigating.                        |
| `execution=simulation`                                                                  | Idle simulation for the selected mission.                                  |
| `execution=live`, OAuth, existing runtime binding enabled                               | Existing live adapter; only safe session/owned-event restoration on entry. |
| No execution value, OAuth                                                               | Existing live default when enabled; otherwise idle simulation.             |
| No execution value, ePA `epa-concept`                                                   | Idle conceptual simulation; keep the mission ID/path.                      |
| Invalid/duplicate execution, ePA live, or explicitly requested live without its binding | Localized unavailable state, no live controller or API reads.              |

The clean `/missions/oauth-oidc/workspace` callback remains unchanged. Absent/invalid `mode`
still defaults to Explore. Catalog actions use explicit execution values; the configured
public OAuth runtime offers both actions, while a fixture build shows live unavailable
without enabling it through a URL. Preserve artwork bytes/crop, two-card layout and primary
button alignment; use a 10px action gap within the required 8–12px range. Keep card/action
regions aligned with layout spacing, without adding an ePA live placeholder action.

Alternative: use `mode=simulation` or new application routes. Rejected because `mode`
already means Explore/Inspect and the fixed callback/old bookmarks must remain compatible.

### 3. Share presentation without sharing authentication

Keep controller selection at the mission application/route boundary. Live mounts the
existing OAuth lifecycle; simulation mounts its local mission controller. A minimal
discriminated presentation input at the existing `MissionControl` reuse point supplies
actions, stages, events, provenance and resource presentation. It is not a provider interface
or a second authentication framework. Keep live-only session/CSRF/API objects in the live
branch. Never construct `OAuthSession`, set a live authentication flag or cast synthetic
data to a live resource/event response to make simulation fit the current component props.

Extend neutral `FlowEvent` with a simulated variant containing a local trace identity,
sequence, virtual elapsed offset and simulated outcome. It has no `observation`, real
observer/time or resource-server report. Add simulation source handling to the existing
resource presentation model, separately from the unchanged strict wire decoders. Inspector,
timeline, filters and RecordedFlow use the provenance discriminator, not mission IDs.
All affected views show the correct source/outcome/timing; invalid cross-kind inputs fail
closed. Existing fixtures/explanatory annotations remain non-observed.

| Boundary  | Simulation                                                                  | Live Demo                                                       |
| --------- | --------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Banner    | `Simulierter Ablauf – keine echte Authentifizierung`                        | `Echte Protokollausführung`                                     |
| English   | `Simulated flow – no real authentication`                                   | `Real protocol execution`                                       |
| Authority | In-memory educational state only                                            | Existing BFF session, owned history and independent HAPI checks |
| Transport | No provider/BFF/FHIR/legacy requests, including session/history restoration | Existing same-origin API and top-level login navigation         |
| Evidence  | Explicitly simulated; ePA also conceptual; virtual timing                   | Actual BFF observations and separately validated HAPI reports   |
| Resource  | Locally defined fictional result                                            | Existing validated safe projection from the explicit real read  |

Render simulation labeling on status, flow, event detail, response and virtual-time fields,
not just a badge that disappears in Inspect. Never display a fabricated Keycloak observer
or give a simulated 200/403 the source `hapi`. Do not add simulated fields to backend DTOs.
Alternative: reuse mocked live API responses. Rejected because this would hide network
coupling and allow synthetic authority/provenance to enter real execution paths.

### 4. Two finite mission simulations, not an engine

Put each mission's pure state transitions and safe event/content definitions in its
existing mission domain/data responsibilities; application coordination owns timers and
actions. Share only neutral presentation and small control behavior with demonstrated
use. No configurable workflow language, dynamic scenario registry or new persistence.

Each mounted simulation retains one finite attempt and a bounded event prefix. IDs use
a local attempt ordinal plus stable mission/step identifiers, with no backend run lookup.
For the same input/actions, event order/outcomes/virtual offsets repeat independently of
wall-clock time, network or random values. Reset advances the local attempt generation
and clears progress/events/result; late ticks cannot commit to a new attempt. Reload or
mission/execution change discards it. Locale and Explore/Inspect changes do not remount it.

Start reveals the first synthetic authorization step and leaves progression paused.
Explicit Step advances one unrevealed transition; Play advances at a fixed presentation
cadence until a terminal result or explicit resource-action boundary. Pause cancels that
timer. Previous/Replay/event selection inspect already revealed frames without appending
events or changing the simulation's established progress/result. The mission coordinator
supplies these callbacks to reused playback controls; generic protocol-flow never executes
a protocol transition. Repeated Start while active and repeated resource activation after
its fixed result are disabled/idempotent; a fresh attempt requires explicit reset/restart.
Reduced motion disables autoplay and retains step/selection. Leaving Flow or Inspect
pauses automatic progression. Live playback and Reset view keep their current read-only
meaning; Reset simulation is a distinct labeled command, never a synonym for real logout.

**OAuth:** ready → simulated authorization/redirect → Code/S256 callback/exchange → local
validation → simulated session → wait for explicit simulated read → completed or denied.
Use existing Browser, BFF, grouped AS/IdP and Resource Server role/channel content. Explain
opaque code/verifier/token concepts using fixed non-usable labels, not JWTs, random codes,
cryptographic keys, copied callbacks or network URLs. Provide exactly success, PKCE
rejection and missing-resource-permission examples, selected before Start. These are
fixed educational branches, not a security experiment/scenario framework.

The OAuth resource panel reuses `ResourceForm`/`ResourceResult` framing, JSON/overview and
metadata tabs with a local safe fictional Basic projection for `Basic/playground-demo`.
Use only this approved synthetic shape; omit fake HAPI version timestamps, latency and
headers. Simulation may demonstrate session success with a later permission denial.
Neither that result nor synthetic session state can enable the live Explorer.

**ePA:** use existing `epa-concept` actors and [documented lab roles](../../../docs/architecture.md),
[ePA scope](../../../EPA.md), [traceability limitations](../../../docs/specifications.md)
and [concept fixture](../../../docs/design/fixtures/epa-concept.md). Explain that the lab's
ePA authorization service is an OAuth client toward its IdP, and distinguish its direct PAR
from the subsequent user-agent authorization-reference redirect. Identity/authorization
boundaries and the VAU/protected-system topic remain conceptual; this is not a normative
end-to-end gematik transcript or a claim that a real FdV is this browser SPA. Provide only
the bounded success narrative and a PAR-rejection example. The protected-result area
reuses shared framing for conceptual authorization explanations, not an invented patient
or ePA FHIR payload. Keep its wording and PAR choreography in the ePA mission; no real
sectoral parameters, TI proofs, endpoints or implementation are added.

### 5. Mode changes preserve lifecycle and privacy boundaries

Key mounted execution by mission plus resolved execution kind, not Explore/Inspect or
locale. Unmount/abort outgoing controller work, cancel its timers and discard its displayed
resource payload. Check attempt/controller identity before committing any asynchronous
result. No observed history/result is passed to the simulation, even when the same real
cookie exists; returning to live re-reads authoritative session/owned events only.

Mode selection is not logout: real authentication stays server-held until existing expiry
or explicit secure logout/cancellation in Live Demo. Communicate this distinction; do not
send an implicit logout when entering simulation or pretend that an aborted UI fetch
cancelled a server-side login. Existing Origin/CSRF/context rotation, late callback/read
rejection, bounded safe history and cleanup-on-event-failure remain unchanged. Simulation
has no credentials to clear. Persist only the existing explicit language preference.

### 6. Verification is isolated and source-aware

- Exercise both simulations with service-path request counters, blocked service access
  and an existing authenticated/pending browser context. Assert zero attempted session,
  event, login, resource, discovery/token or legacy requests, not merely mocked success.
- Test deterministic transitions, finite buffers, invalid ordering, duplicate actions,
  pause/end/reduced-motion behavior, replay versus reset, remount/BFCache and stale work.
  Test the full routing table, old fixture links and no query-based runtime activation.
- Reuse current browser/architecture/localization suites; extend exact provenance checks
  for every presentation surface and simulated failure branch. Test late live responses
  and logout/mode switching without replacing the existing security regressions.
- Compare real captures of Catalog, OAuth Simulation Explore/Inspect, OAuth Live Demo and
  ePA Simulation against the actual v2 header and preserved catalog artwork. Include DE/EN,
  1672×941 and Inspect 1585×992, 390/320px, keyboard/axe/contrast, reduced motion and native
  100%/200% zoom. Record and correct differences instead of weakening old geometry checks.
- Run a real isolated Keycloak/BFF/HAPI login → callback → refresh → permitted synthetic
  read → Inspect → CSRF logout → old-auth rejection/history journey, plus focused real
  ePA/PAR/browser regressions. Reuse existing harnesses; modify no production state or
  provider policies. Mocked browser tests do not replace this regression evidence.
- Run SPA typecheck/build/browser tests, focused backend regressions, architecture and
  localization checks, disclosure scans, formatting and strict OpenSpec validation. Do
  not add unrelated upgrades or repeat unchanged database/security implementation work.

## Risks / Trade-offs

- Synthetic results could resemble authentication → separate presentation variants and
  persistent localized source labels; zero live DTO reuse or shared result state.
- Header extraction affects CSS scope/layout → preserve measured v2 geometry and compare
  all five surfaces, removing duplicate mounting rather than retaining hidden alternatives.
- Historical fixture/concept contracts differ → explicit alias-to-idle-simulation behavior
  and active documentation reconciliation; retain earlier evidence and security clauses.
- An ePA diagram could imply normative correctness → source-bounded conceptual sequence,
  no real transactions, protected patient data or unsupported protocol/VAU assertions.
- Switching from live might be mistaken for sign-out → explicit explanatory copy and
  preserved deliberate secure logout/cancellation; no hidden network work in simulation.

## Migration Plan

Implement only after approval, in task order: header → catalog → execution/provenance
boundary → OAuth simulation → ePA simulation → integrated verification. No database,
backend API or provider migration is needed. Reconcile only affected active product/UX
and runtime documentation; preserve previous OpenSpec task/evidence history.

Prepare and verify SPA changes in isolation. This change does not grant a public release;
any future rollout needs its own owner instruction and immutable SPA verification.
Application rollback restores the previously reviewed SPA image, returning old catalog/
preview presentation while the unchanged BFF/provider/HAPI and secure logout continue.
No credential, data, volume or shared-stack rollback is necessary. Do not deploy or archive
during proposal creation or implementation-only work.

No unresolved material design decision blocks this proposal. Availability of a future
isolated real-component test runtime must be reported at execution time; the planning
HTTP probe result is not an infrastructure remediation prerequisite.
