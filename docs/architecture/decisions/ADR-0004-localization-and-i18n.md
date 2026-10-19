# ADR-0004: German-First Localization and Internationalization

- **Status:** Accepted
- **Date:** 2026-10-19
- **Project:** Auth Protocol Playground
- **Scope:** Browser-based React SPA, Mission Catalog and Mission Control UI
- **Related decision:** ADR-0003 — Capability-First Code Organization
- **Implementation:** `localization-foundation`, authorized by the owner's explicit apply request on 2026-10-19. This decision alone does not authorize backend or authentication changes.

## Context

The playground currently contains user-facing text directly in React components and mission/fixture definitions. This makes the interface inconsistent, complicates English support, and couples translated presentation content to generic protocol-flow logic.

The product should launch primarily for German-speaking users while offering an English interface. This decision establishes one small, consistent localization mechanism without a translation platform or unnecessary abstractions.

## Decision

### 1. Supported languages and selection

- **German (`de`) is the default and fallback language**, regardless of browser language.
- **English (`en`) is supported** from the first localization slice.
- The UI provides a simple, accessible language switcher (`Deutsch` / `English`). Switching languages does not reload or reset the active mission.
- The user's explicit choice is stored locally (for example, `localStorage`) and restored on reload. If there is no valid saved choice, select `de`.
- Set the document's `<html lang>` attribute to the active language.
- Do not add automatic browser-language detection, accounts, server-side locale negotiation or a localization backend unless a later requirement justifies them.

### 2. Centralized translation resources with clear namespaces

All user-facing UI copy lives in external, UTF-8 translation resource files, **not inline in JSX, hooks, domain rules, or mission registries**. For the initial app, use a straightforward layout:

```text
apps/playground/src/
├── app/
│   └── i18n.ts                         # One initialization/configuration point
├── locales/
│   ├── de/
│   │   ├── common.json                 # Global navigation, status, actions
│   │   ├── mission.json                # Catalog and mission metadata
│   │   └── protocol-flow.json          # Workspace, inspector, explanations
│   └── en/
│       ├── common.json
│       ├── mission.json
│       └── protocol-flow.json
└── features/
    ├── mission/
    └── protocol-flow/
```

Translation namespaces reflect capabilities while the resources remain easy to locate together. When a concrete new feature requires its own vocabulary (e.g., an ePA mission), add its namespace then, not before. Do not create separate i18n frameworks per capability.

- Use **stable, semantic keys** such as `mission:catalog.title`, `common:actions.start` and `protocol-flow:inspector.channel.frontChannel`.
- Resolve display names, descriptions, learning instructions, empty states, errors, buttons, badges, tooltips, accessible labels, alt text and fixture explanations via translated keys.
- Mission/domain definitions retain language-neutral IDs and protocol data. Presentation resolves translation keys; domain objects do not import the localization runtime.
- Prefer parameter interpolation and pluralization over string concatenation; use locale-aware formatting for dates and numbers when displayed.

### 3. Library and integration

Use the existing localization library if one is already adopted and suitable. Otherwise, prefer **`i18next` with `react-i18next`**, configured once at the SPA composition boundary. Avoid writing a custom translation framework, adding unnecessary state management, or introducing translation services.

UI components use their namespace through the translation hook; the domain layer does not depend on React or i18n. This is consistent with ADR-0003.

### 4. Protocol terminology, security and evidence

**Translate explanations, not protocol data.** Keep OAuth/OIDC and ePA identifiers, endpoint paths, claim names, HTTP methods/status codes, token-type names, technical event IDs and observed wire-level values unchanged. For example, `code_verifier`, `code_challenge`, `authorization_code`, `/token` and `state` are not localized.

- Localize only the **human-readable description** of a protocol step.
- Do not modify payloads, request parameters, token validation, protocol state machines or captured evidence based on UI language.
- Keep fixture/educational annotations clearly distinguished from actually observed events in both languages.
- Backend errors should expose stable, safe error codes where needed; the SPA maps those codes to translated messages without showing secrets or raw diagnostics.

### 5. Missing translations and quality

- If an English translation is missing, fall back to German without breaking the interface.
- Treat missing keys and namespace mismatches as **development/test failures to fix**, not as an accepted release state.
- Keep both languages complete for every released screen; a small automated key-parity test is sufficient.
- Verify long translated labels, keyboard-operated language switching, accessible names and the mission workspace at supported viewports.

## Consequences

**Benefits:** One predictable source of UI copy; language switching independent of mission logic; reusable protocol-neutral components; easier addition of English and future mission-specific copy.

**Costs:** Existing hardcoded copy and fixture explanations must be moved into dictionaries. Two locale files must remain aligned when UI text changes.

## Rejected alternatives

1. **Hardcoded German/English conditionals in components:** difficult to maintain and test.
2. **Translations stored inside domain models or runtime protocol events:** couples business/protocol contracts to presentation and risks changing evidence.
3. **One large unstructured dictionary:** obscures ownership as missions grow.
4. **Custom i18n engine, remote translation service, per-mission plugin loader:** unnecessary for two languages and current scope.
5. **Automatic browser-language detection:** conflicts with the explicit German-default requirement.

## Implementation and acceptance

Implement through one focused OpenSpec change after adopting this ADR. Preserve all existing visual design, behavior, mission boundaries and protocol semantics.

- No remaining hardcoded **user-facing** copy in current Catalog/Workspace components and fixture explanations, apart from legitimate technical literals and brand/protocol names.
- Default visit without saved preference is German; English can be selected and remains selected after reload.
- Switching locale retains the current mission, selection and fixture state.
- Both languages cover navigation, mission cards, timeline, inspector, empty/error states and accessibility text.
- `<html lang>` reflects the active locale; unsupported or invalid stored values fall back to `de`.
- Translation key-parity check, existing TypeScript/build/browser/accessibility tests and relevant OpenSpec validation pass.
- No BFF/Keycloak changes, API contract changes or architectural rewrites.

Revisit this ADR only if localization needs expand materially (e.g., content authoring, plural-rich editorial workflows or server-rendered interfaces).
