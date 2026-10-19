# UX Fixture — ePA / gematik (Conceptual)

**Status:** CONCEPT / PLANNED · **Not an implementation specification or gematik compliance statement.**

## Goal

Test whether the shared Workspace can represent a **different set of actors and security explanations** without OAuth-specific hardcoding. Exact ePA protocol choreography will be sourced from the applicable current gematik specifications in a later approved change.

## Illustrative actor types only

| Actor label | Logical responsibility (illustrative) |
|---|---|
| User / insured person | Initiates a protected ePA journey |
| FdV browser/clients (scenario-dependent) | User-facing access channel (future scenario to specify) |
| ePA Authorization Service | Authorization-related interactions for the selected ePA journey |
| Sectoral Identity Provider | Authentication/identity role, when applicable to the selected flow |
| ePA system boundary / VAU | Protected subsystem / secure communication topic to model separately |

**Do not assume these actors always all interact in one sequence.** This is a layout stress test only, *not* a runnable ePA mission and not a claim that ePA FdV is implemented as a browser SPA.

## Conceptual learning checkpoints

Discover actor responsibilities → Examine identity/federation boundary → Inspect authorization boundary → Understand protected-system boundary → Review evidence vs explanatory steps.

## UX acceptance test

The same Catalog card template, actor canvas, timeline, inspector and learning checklist can display these entries with **zero generic shell special cases for** `oidc`, `keycloak`, `state`, `PKCE`, `VAU` or `FdV`.

## Execution status

`Planned — no live integration, no telemetry and no simulated operational results.`
