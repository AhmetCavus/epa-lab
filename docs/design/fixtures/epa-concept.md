# UX Fixture — ePA / gematik (Conceptual)

**Status:** CONCEPT / PLANNED · **Not an implementation specification or gematik compliance statement.**

## Goal

Test whether the shared Workspace can represent a **different set of actors and security explanations** without OAuth-specific hardcoding. Exact ePA protocol choreography will be sourced from the applicable current gematik specifications in a later approved change.

## Illustrative actor types only

| Actor label                              | Logical responsibility (illustrative)                                |
| ---------------------------------------- | -------------------------------------------------------------------- |
| User / insured person                    | Initiates a protected ePA journey                                    |
| FdV browser/clients (scenario-dependent) | User-facing access channel (future scenario to specify)              |
| ePA Authorization Service                | Authorization-related interactions for the selected ePA journey      |
| Sectoral Identity Provider               | Authentication/identity role, when applicable to the selected flow   |
| ePA system boundary / VAU                | Protected subsystem / secure communication topic to model separately |

**Do not assume these actors always all interact in one sequence.** This is a layout stress test only, _not_ a runnable ePA mission and not a claim that ePA FdV is implemented as a browser SPA.

## Conceptual learning checkpoints

Discover actor responsibilities → Examine identity/federation boundary → Inspect authorization boundary → Understand protected-system boundary → Review evidence vs explanatory steps.

## UX acceptance test

The same Catalog card template, actor canvas, timeline, inspector and learning checklist can display these entries with **zero generic shell special cases for** `oidc`, `keycloak`, `state`, `PKCE`, `VAU` or `FdV`.

## Execution status

`Planned — no live integration, no telemetry and no simulated operational results.`

## Interactive conceptual simulation (2026-11-17)

The approved `unified-shell-and-simulations` extension replaces the earlier layout-only
preview with a local, deterministic educational simulation in the existing v2 shell.
Enter `/missions/epa-concept/workspace?execution=simulation`; older bare/fixture links
resolve to the same conceptual mode. No ePA Live Demo action is offered.

Source boundaries are the illustrative actor definitions above, the lab PAR operation in
[EPA.md](../../../EPA.md), and the role/channel distinctions in
[system context](../../architecture/system-context.md). The ePA authorization service acts
as OAuth client toward the IdP in this lab model. Direct service PAR/reference exchanges
are distinct from user-agent navigation. Actor-local identity, authorization and protected
system explanations are concepts, never observed provider transactions. This is neither a
normative gematik transaction sequence nor a certification/conformance statement.

Start reveals one paused step. Explicit Step/Play advances the fixed success or PAR-rejection
example. Replay/Previous inspect already revealed steps; Reset discards the attempt. A separate
protected-access learning action opens an explanation only: no invented endpoint, HTTP success,
FHIR/clinical payload or VAU handshake. Locale/view changes preserve local progress; leaving the
mission or reloading starts idle. Reduced motion requires manual stepping. There are no calls
to Keycloak, BFF, HAPI or legacy ePA endpoints and no authenticated session or usable credentials.

The earlier execution-status section records the original fixture's historical scope; the
interactive simulation changes presentation/education only and adds no real ePA integration.
