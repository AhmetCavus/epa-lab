# Proposal

**APPROVED for isolated implementation, 2026-11-17.** The owner's subsequent explicit apply
request authorizes the 22 implementation/verification tasks. Public release requires its own
instruction. Preserve the deployed Mission Control v2 SPA/BFF and provider/data configuration.

## Why

OAuth Mission Control v2 already runs, but the catalog and conceptual previews still use
an older shell and static samples. Give both missions a consistent entry point and an
interactive, clearly simulated learning path without changing the working live integration.

## What Changes

- Extract the live v2 header into one shared, once-rendered application header for the
  catalog, OAuth simulation/live workspace and ePA simulation. Preserve its navy geometry,
  typography, navigation and DE/EN selector; replace the approximated inline mark with
  the official Yappai icon identified in the existing Yappai website source.
- Keep existing catalog artwork, hero, two-card composition and responsive hierarchy.
  OAuth offers primary **Simulation starten** and secondary **Live-Demo starten**;
  ePA offers only primary **Simulation starten**. Align actions with an 8–12px gap and
  truthful simulation/live availability labels.
- Select simulation/live separately from Explore/Inspect. Preserve the fixed live
  callback route and map old `view=fixture` links to an idle, network-free simulation.
  Live remains available only through the existing explicit runtime binding.
- Replace Samples with two small mission-owned deterministic simulations using the
  existing Explore, Inspect, Animated Flow, timeline and resource-result presentation.
  OAuth demonstrates Code/S256, session and the fictional `Basic/playground-demo` read;
  ePA explains actors, PAR, redirects and protected-system boundaries conceptually.
- Add explicit simulated provenance, synthetic outcomes and virtual timing. Keep these
  separate from observed/reported live events and authoritative authentication; never
  call Keycloak, BFF or HAPI from simulation or manufacture usable credentials.
- Verify mode switching, bounded playback/reset, focused failure examples, both locales,
  visual fidelity, accessibility and unchanged real OAuth/ePA/PAR behavior in isolation.

## Capabilities

### New Capabilities

- `unified-application-shell`: shared v2 header, official branding, contextual navigation,
  catalog actions and consistent localized/responsive presentation.
- `protocol-simulations`: explicit execution selection, isolated deterministic OAuth and
  conceptual ePA progression, honest event/resource provenance and lifecycle boundaries.

### Modified Capabilities

None in the published inventory (`openspec list --specs --json` returns no capabilities).
Reuse the implemented, unarchived `mission-control-ux-v2` contracts as the baseline; this
change extends their presentation for simulations and supersedes static-Samples/concept-only
availability, without changing live authentication, resource authorization or wire schemas.
Historical change evidence remains intact.

## Impact

Frontend only: `apps/playground/src/app`, `features/mission`, neutral `features/protocol-flow`
presentation, existing CSS tokens/assets, DE/EN resources and focused tests/documentation.
Reuse the current mission/API adapters and backend unchanged. Vendor the existing official
icon locally during implementation; do not hotlink it or invent artwork.

No new framework, service, database, dependency, generic simulation/plugin engine, real
gematik transaction or certification claim. No production configuration, credential,
Keycloak policy, HAPI policy/data, PostgreSQL, live deployment or routing changes.
