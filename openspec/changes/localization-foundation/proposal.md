# Proposal

## Why

The current fixture-only frontend embeds English copy in components, coordination hooks and mission definitions. ADR-0004 proposes a German-first interface with English support; a single localization foundation will make that possible while preserving the capability boundaries established by ADR-0003.

**Status: APPROVED for frontend implementation.** The owner's explicit apply request on 2026-10-19 approves this plan and adoption of ADR-0004. Authorization is limited to this fixture-only localization change; backend/authentication work and Slice 002 remain excluded.

## What Changes

- Default to German (`de`) regardless of browser language, support English (`en`), restore a valid explicit language preference, and fall back to German for invalid preferences or missing English translations.
- Add an accessible `Deutsch` / `English` control in the existing global header. Switching updates all current-screen copy, document language/title and accessibility text without navigation, reload, or loss of mission/checkpoint/selection/fixture/map state.
- Centralize current UI and educational copy in UTF-8 `common`, `mission` and `protocol-flow` resources for both languages, using semantic keys, interpolation and pluralization where appropriate.
- Initialize `i18next` and `react-i18next` once at app composition. Keep domain contracts and mission registration free of localization runtime dependencies and translated strings; retain stable IDs and technical data.
- Preserve protocol literals, message endpoints/order, evidence classifications and the distinction between fixture explanations and observed results. Translate explanatory labels rather than protocol values.
- Add key-completeness/fallback checks and browser/accessibility/visual coverage in both languages. Permit only the language preference in local storage; preserve the prohibition on authentication material and session persistence.
- Reconcile focused architecture, product-language and UX guidance with ADR-0004 during implementation. Preserve prior verification history, styling/assets and existing navigation/interactions.

## Capabilities

### New Capabilities

- `localization`: German-default language selection, persistence, translated presentation, safe fallback, accessibility and language-independent workspace/protocol behavior.

### Modified Capabilities

None. `openspec list --specs` reports no published specifications. The in-flight `mission-experience` and `mission-control-interactions` specifications remain applicable; this additive language contract preserves their behavior and visual requirements. Existing literal English accessible-name assertions will need equivalent locale-aware coverage.

## Impact

- Frontend only: `apps/playground/src/app`, `main.tsx`, `index.html`, mission and protocol-flow capability presentation/content contracts, and new `src/locales/{de,en}` JSON resources.
- Add only `i18next` and `react-i18next` and their lockfile updates; no language detector, translation service, global state framework or backend dependency.
- Tests: current Playwright/browser, accessibility, layout and architecture checks; add focused localization checks using existing tooling. Update the blanket empty-localStorage assertion to allow exactly the language preference and nothing sensitive.
- Documentation: ADR-0004 adoption when approved, concise AGENTS/package guidance, the proposed-English line in product scope, and relevant Catalog/Workspace language guidance. Technical documentation remains English.
- No BFF, Keycloak, API contracts, OAuth integration, Slice 002, repository-wide restructuring, new missions, or redesign.
