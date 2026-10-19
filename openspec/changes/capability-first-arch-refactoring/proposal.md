# Capability-first Architecture Refactoring

**Status:** IMPLEMENTED — authorized by the owner's apply request; evidence and the move map are recorded in `verification.md`.  
**Date:** 2026-10-19  
**Scope:** Structural frontend refactoring of the existing fixture-only application.

## Why

The frontend already has a working catalog, mission definitions and reusable protocol visualization, but ownership is spread across `catalog/`, `missions/` and `workspace/`. `Workspace.tsx` combines route lookup, learning/fixture coordination, selection state and presentation, while the mixed mission model makes generic visualization depend on mission-owned contracts.

Establish capability ownership and dependency direction while preserving the current application, including the owner's existing uncommitted work, visuals and interactions.

## What Changes

- Group the existing components and functions into `app/`, `features/mission/` and `features/protocol-flow/`, with responsibility directories only where actual code belongs.
- Split existing contracts by ownership without changing their fields, discriminated unions, values or semantics. Mission definitions consume neutral protocol-flow contracts; generic visualization has no dependency on mission implementations.
- Extract existing coordination into two small application hooks: mission checkpoint/fixture coordination and generic inspection selection. Retain browser layout, map zoom/scroll and rendering in UI modules.
- Preserve static registration, move fixture declarations into mission data, and expose small public interfaces for composition and cross-capability access.
- Document the decision in `docs/architecture/decisions/ADR-0003-capability-first-code-organization.md` with status **Accepted**, and add concise enforceable rules to `AGENTS.md` during apply. Existing backend ADR approvals remain unchanged.
- Preserve existing tests, add a focused dependency-boundary/cycle check using installed tooling, and verify rendered equivalence against fresh pre-refactor captures.

## Capabilities

### New Capabilities

None. This introduces no product capability or user-visible behavior.

### Modified Capabilities

None. Existing mission-experience and mission-control-interaction behavior remains the acceptance baseline. `.openspec.yaml` declares `skip_specs: true`; no delta specs are created or modified for source organization alone.

This change is a refactoring work record under the repository's change/approval discipline, as explicitly requested through the propose workflow. It does not introduce a feature specification solely to move files.

## Impact

The affected boundary is `apps/playground/src/`, imports in the existing browser/layout tests, focused architecture checks, the package guide, one new ADR and architectural rules in `AGENTS.md`. React, TypeScript, Vite, URLs and package dependencies remain unchanged. `main.tsx` and `styles.css` can remain at their existing entry paths; styles and design assets retain identical content and order.

No OAuth/backend work, Slice 002, service or infrastructure changes, new application, plugin system, repository/DI framework, placeholder layers, domain redesign or visual cleanup is included. Preserve other OpenSpec changes and their verification history.

## Acceptance

The mapped files have clear capability/layer ownership; the production import graph has no cycles or forbidden dependency edges; canonical models are declared once and remain framework-independent. Both current mission routes, checkpoint/actor/event selection, fixture loading/replay/reset, synchronized highlighting/Inspector, responsive scrolling/Fit, keyboard behavior and evidence classifications behave exactly as before. Fresh TypeScript/build/browser/accessibility checks and strict OpenSpec validation pass, and same-environment before/after screenshots show no unexplained visual changes. Any unavailable check is explicitly reported rather than treated as passed.
